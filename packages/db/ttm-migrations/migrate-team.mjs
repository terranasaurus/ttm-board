#!/usr/bin/env node
// Apply pending database migrations to the TTM Portal's `team` schema.
//
//   POSTGRES_URL=postgres://kan_app...  node packages/db/ttm-migrations/migrate-team.mjs           # dry run
//   POSTGRES_URL=postgres://kan_app...  node packages/db/ttm-migrations/migrate-team.mjs --apply   # apply
//
// Why not `pnpm db:migrate`? Upstream Kan migrations hard-code "public".; ours
// live in "team". Drizzle also decides what is pending by comparing timestamps,
// and upstream has shipped out-of-order `when` values, so a late-dated file
// could be skipped silently. This script:
//   1. Upstream (packages/db/migrations): applies every journal entry whose
//      sha256 is not in drizzle.__drizzle_migrations, rewriting "public". ->
//      "team"., then records the ORIGINAL hash + `when` so drizzle's own
//      bookkeeping stays consistent.
//   2. TTM (packages/db/ttm-migrations/*.sql): applies files not yet recorded in
//      team.ttm_migrations, in name order. A changed file that was already
//      applied is an error.
// Every migration runs in its own transaction. Connect as kan_app (search_path
// = team, extensions) so new objects are owned by the app role.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const require = createRequire(join(root, "packages/db/package.json"));
const { Client } = require("pg");

const APPLY = process.argv.includes("--apply");
const url = process.env.POSTGRES_URL;
if (!url) {
  console.error("POSTGRES_URL is required (connect as kan_app).");
  process.exit(2);
}

const sha256 = (s) => createHash("sha256").update(s).digest("hex");
const split = (sql) =>
  sql
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter(Boolean);

// Objects qualified with another schema would land outside `team`.
const FOREIGN_SCHEMA =
  /(^|[^\w"])"?(auth|storage|extensions|drizzle|vault|realtime|graphql|graphql_public|pg_catalog|information_schema|supabase_migrations)"?\s*\./i;
const CREATE_SCHEMA = /\bcreate\s+schema\b/i;

function upstreamPlan() {
  const dir = join(root, "packages/db/migrations");
  const journal = JSON.parse(readFileSync(join(dir, "meta/_journal.json"), "utf8"));
  return journal.entries.map((e) => {
    const raw = readFileSync(join(dir, `${e.tag}.sql`), "utf8");
    return { name: e.tag, when: e.when, hash: sha256(raw), raw, sql: raw.replaceAll('"public".', '"team".') };
  });
}

function ttmPlan() {
  const dir = join(root, "packages/db/ttm-migrations");
  return readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => {
      const raw = readFileSync(join(dir, f), "utf8");
      return { name: f, hash: sha256(raw), sql: raw };
    });
}

function vet(m) {
  if (FOREIGN_SCHEMA.test(m.sql)) throw new Error(`${m.name}: references a schema other than team/public; refusing.`);
  if (CREATE_SCHEMA.test(m.sql)) throw new Error(`${m.name}: creates a schema; refusing.`);
}

const client = new Client({ connectionString: url });
await client.connect();
try {
  const { rows: [who] } = await client.query("select current_user, current_setting('search_path') as sp");
  console.log(`connected as ${who.current_user} (search_path: ${who.sp})${APPLY ? "" : "  [dry run]"}`);
  if (!/(^|,\s*)team(,|$)/.test(who.sp)) throw new Error("search_path must include team; connect as kan_app.");

  await client.query(`create table if not exists ttm_migrations (
    name text primary key, hash text not null, applied_at timestamptz not null default now())`);
  const doneUp = new Set((await client.query("select hash from drizzle.__drizzle_migrations")).rows.map((r) => r.hash));
  const doneTtm = new Map((await client.query("select name, hash from ttm_migrations")).rows.map((r) => [r.name, r.hash]));

  const pendingUp = upstreamPlan().filter((m) => !doneUp.has(m.hash));
  const ttm = ttmPlan();
  for (const m of ttm) {
    const prev = doneTtm.get(m.name);
    if (prev && prev !== m.hash) throw new Error(`${m.name} changed after it was applied; add a new migration instead.`);
  }
  const pendingTtm = ttm.filter((m) => !doneTtm.has(m.name));
  [...pendingUp, ...pendingTtm].forEach(vet);

  console.log(`upstream pending: ${pendingUp.length ? pendingUp.map((m) => m.name).join(", ") : "none"}`);
  console.log(`ttm pending:      ${pendingTtm.length ? pendingTtm.map((m) => m.name).join(", ") : "none"}`);
  for (const m of APPLY ? pendingUp : []) {
    await client.query("begin");
    try {
      for (const stmt of split(m.sql)) await client.query(stmt);
      await client.query("insert into drizzle.__drizzle_migrations (hash, created_at) values ($1, $2)", [m.hash, m.when]);
      await client.query("commit");
      console.log(`applied upstream ${m.name}`);
    } catch (e) {
      await client.query("rollback");
      throw new Error(`${m.name}: ${e.message}`);
    }
  }
  for (const m of APPLY ? pendingTtm : []) {
    await client.query("begin");
    try {
      await client.query(m.sql);
      await client.query("insert into ttm_migrations (name, hash) values ($1, $2)", [m.name, m.hash]);
      await client.query("commit");
      console.log(`applied ttm ${m.name}`);
    } catch (e) {
      await client.query("rollback");
      throw new Error(`${m.name}: ${e.message}`);
    }
  }
  console.log(APPLY ? "done" : "dry run only; re-run with --apply");
} catch (e) {
  console.error(`error: ${e.message}`);
  process.exitCode = 1;
} finally {
  await client.end();
}

import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { uuid_ossp } from "@electric-sql/pglite/contrib/uuid_ossp";
import { attachDatabasePool } from "@vercel/functions";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePgLite } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { Pool } from "pg";
import { parse as parseConnectionString, toClientConfig } from "pg-connection-string";

import { createLogger } from "@kan/logger";

import * as schema from "./schema";

const log = createLogger("db");

export const pgliteExtensions = { pg_trgm, uuid_ossp };

export type dbClient = NodePgDatabase<typeof schema> & {
  $client: Pool;
};

/**
 * Serverless-friendly pool sizing. Every warm Vercel function instance owns
 * its own pool, so the per-instance cap has to be small or Supabase's
 * connection limit is exhausted by idle instances.
 */
const POOL_MAX = 3;
const POOL_IDLE_TIMEOUT_MS = 10_000;
const POOL_CONNECTION_TIMEOUT_MS = 10_000;

/**
 * Reads the Supabase CA certificate from POSTGRES_CA_CERT. Accepts either the
 * raw PEM (with real newlines) or the same PEM base64-encoded, which is the
 * easier form to paste into a single-line env var.
 */
const readCaCert = (): string | undefined => {
  const raw = process.env.POSTGRES_CA_CERT?.trim();
  if (!raw) return undefined;
  if (raw.includes("-----BEGIN CERTIFICATE-----")) return raw;

  const decoded = Buffer.from(raw, "base64").toString("utf8");
  if (decoded.includes("-----BEGIN CERTIFICATE-----")) return decoded;

  log.warn(
    "POSTGRES_CA_CERT is set but is neither a PEM certificate nor base64 of one; ignoring it",
  );
  return undefined;
};

/**
 * node-postgres lets `sslmode` in the connection string override the `ssl`
 * option passed to the Pool, so when a CA is pinned the URL's `sslmode`
 * (typically the pre-review `sslmode=no-verify`) is dropped to make sure the
 * pinned CA with full verification is what actually applies.
 */
const stripSslModeParam = (connectionString: string): string => {
  try {
    const url = new URL(connectionString);
    if (!url.searchParams.has("sslmode") && !url.searchParams.has("ssl")) {
      return connectionString;
    }
    url.searchParams.delete("sslmode");
    url.searchParams.delete("ssl");
    return url.toString();
  } catch {
    return connectionString;
  }
};

export const createDrizzleClient = (): dbClient => {
  const connectionString = process.env.POSTGRES_URL;

  if (!connectionString) {
    log.warn("POSTGRES_URL not set, falling back to PGLite");

    const client = new PGlite({
      dataDir: "./pgdata",
      extensions: pgliteExtensions,
    });
    const db = drizzlePgLite(client, { schema });

    migrate(db, { migrationsFolder: "../../packages/db/migrations" });

    return db as unknown as dbClient;
  }

<<<<<<< HEAD
  const ca = readCaCert();

  if (!ca) {
    log.warn(
      "POSTGRES_CA_CERT not set; TLS verification falls back to the connection string's sslmode (set the Supabase CA to pin it)",
    );
  }

  const pool = new Pool({
    connectionString: ca
      ? stripSslModeParam(connectionString)
      : connectionString,
    max: POOL_MAX,
    idleTimeoutMillis: POOL_IDLE_TIMEOUT_MS,
    connectionTimeoutMillis: POOL_CONNECTION_TIMEOUT_MS,
    ...(ca ? { ssl: { ca, rejectUnauthorized: true } } : {}),
=======
  // pg treats sslmode=require as "verify the cert" unless parsed with
  // useLibpqCompat; passing connectionString itself (not discrete fields)
  // makes pg re-parse it without that flag, clobbering any fix.
  const parsedConnection = parseConnectionString(connectionString, {
    useLibpqCompat: true,
>>>>>>> upstream/main
  });
  // no-verify is a pg-only extension, not a real libpq sslmode, so
  // useLibpqCompat doesn't recognize it and would silently start verifying.
  if (parsedConnection.sslmode === "no-verify" && typeof parsedConnection.ssl === "object") {
    parsedConnection.ssl = { ...parsedConnection.ssl, rejectUnauthorized: false };
  }
  const pool = new Pool(toClientConfig(parsedConnection));
  // Idle connections error when Postgres restarts; without a listener that crashes the process.
  // The pool drops the dead client and reconnects on the next query.
  pool.on("error", (err) => log.error({ err }, "Postgres pool error"));

  // Lets Vercel drain the pool before a function instance is suspended, so
  // idle connections are released instead of lingering on the database side.
  attachDatabasePool(pool);

  return drizzlePg(pool, { schema }) as dbClient;
};

-- TTM addition: workspace documents (Docs). Applied by packages/db/ttm-migrations/migrate-team.mjs
-- with search_path = team, so names are unqualified on purpose.
CREATE TABLE IF NOT EXISTS "ttm_doc" (
  "id" bigserial PRIMARY KEY NOT NULL,
  "publicId" varchar(12) NOT NULL,
  "workspaceId" bigint NOT NULL REFERENCES "workspace"("id") ON DELETE CASCADE,
  "title" varchar(255) NOT NULL,
  "content" text DEFAULT '' NOT NULL,
  "isPinned" boolean DEFAULT false NOT NULL,
  "createdBy" uuid REFERENCES "user"("id") ON DELETE SET NULL,
  "updatedBy" uuid REFERENCES "user"("id") ON DELETE SET NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  "deletedAt" timestamp,
  CONSTRAINT "ttm_doc_publicId_unique" UNIQUE ("publicId")
);
CREATE INDEX IF NOT EXISTS "ttm_doc_workspace_idx" ON "ttm_doc" ("workspaceId") WHERE "deletedAt" IS NULL;
ALTER TABLE "ttm_doc" ENABLE ROW LEVEL SECURITY;

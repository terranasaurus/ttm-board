// TTM addition (not upstream Kan): workspace documents, modelled on Plane's
// Pages and OpenProject's wiki. Created by packages/db/ttm-migrations/, not by
// Kan's drizzle migrations, so upstream merges stay conflict-free.
import { relations } from "drizzle-orm";
import {
  bigint,
  bigserial,
  boolean,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { users } from "./users";
import { workspaces } from "./workspaces";

export const ttmDocs = pgTable("ttm_doc", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  publicId: varchar("publicId", { length: 12 }).notNull().unique(),
  workspaceId: bigint("workspaceId", { mode: "number" })
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull().default(""),
  isPinned: boolean("isPinned").notNull().default(false),
  createdBy: uuid("createdBy").references(() => users.id, { onDelete: "set null" }),
  updatedBy: uuid("updatedBy").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  deletedAt: timestamp("deletedAt"),
}).enableRLS();

export const ttmDocsRelations = relations(ttmDocs, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [ttmDocs.workspaceId],
    references: [workspaces.id],
  }),
  updatedByUser: one(users, {
    fields: [ttmDocs.updatedBy],
    references: [users.id],
    relationName: "ttmDocsUpdatedByUser",
  }),
}));

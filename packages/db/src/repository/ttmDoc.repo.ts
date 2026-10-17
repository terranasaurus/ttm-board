import { and, desc, eq, isNull } from "drizzle-orm";

import type { dbClient } from "@kan/db/client";
import { ttmDocs, users } from "@kan/db/schema";
import { generateUID } from "@kan/shared/utils";

const summaryColumns = {
  publicId: ttmDocs.publicId,
  title: ttmDocs.title,
  isPinned: ttmDocs.isPinned,
  updatedAt: ttmDocs.updatedAt,
  updatedByName: users.name,
};

export const listByWorkspaceId = (db: dbClient, workspaceId: number) =>
  db
    .select(summaryColumns)
    .from(ttmDocs)
    .leftJoin(users, eq(users.id, ttmDocs.updatedBy))
    .where(and(eq(ttmDocs.workspaceId, workspaceId), isNull(ttmDocs.deletedAt)))
    .orderBy(desc(ttmDocs.isPinned), desc(ttmDocs.updatedAt));

export const getByPublicId = async (db: dbClient, publicId: string) => {
  const [row] = await db
    .select({
      id: ttmDocs.id,
      workspaceId: ttmDocs.workspaceId,
      content: ttmDocs.content,
      ...summaryColumns,
    })
    .from(ttmDocs)
    .leftJoin(users, eq(users.id, ttmDocs.updatedBy))
    .where(and(eq(ttmDocs.publicId, publicId), isNull(ttmDocs.deletedAt)))
    .limit(1);
  return row ?? null;
};

export const create = async (
  db: dbClient,
  input: { workspaceId: number; title: string; content: string; userId: string },
) => {
  const [row] = await db
    .insert(ttmDocs)
    .values({
      publicId: generateUID(),
      workspaceId: input.workspaceId,
      title: input.title,
      content: input.content,
      createdBy: input.userId,
      updatedBy: input.userId,
    })
    .returning({ publicId: ttmDocs.publicId });
  return row;
};

export const update = (
  db: dbClient,
  id: number,
  input: { title?: string; content?: string; isPinned?: boolean; userId: string },
) =>
  db
    .update(ttmDocs)
    .set({
      ...(input.title !== undefined && { title: input.title }),
      ...(input.content !== undefined && { content: input.content }),
      ...(input.isPinned !== undefined && { isPinned: input.isPinned }),
      updatedBy: input.userId,
      updatedAt: new Date(),
    })
    .where(eq(ttmDocs.id, id));

export const softDelete = (db: dbClient, id: number) =>
  db.update(ttmDocs).set({ deletedAt: new Date() }).where(eq(ttmDocs.id, id));

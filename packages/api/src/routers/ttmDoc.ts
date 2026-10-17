// TTM addition (not upstream Kan): workspace documents ("Docs").
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { Permission } from "@kan/shared";
import type { dbClient } from "@kan/db/client";
import * as ttmDocRepo from "@kan/db/repository/ttmDoc.repo";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";

import { createTRPCRouter, protectedProcedure } from "../trpc";
import { assertPermission } from "../utils/permissions";

const docSummarySchema = z.object({
  publicId: z.string(),
  title: z.string(),
  isPinned: z.boolean(),
  updatedAt: z.date(),
  updatedByName: z.string().nullable(),
});
const docSchema = docSummarySchema.extend({ content: z.string() });

const MAX_CONTENT = 500_000;

function requireUser(userId: string | undefined): string {
  if (!userId)
    throw new TRPCError({ message: "User not authenticated", code: "UNAUTHORIZED" });
  return userId;
}

async function loadDoc(db: dbClient, userId: string, docPublicId: string, permission: Permission) {
  const doc = await ttmDocRepo.getByPublicId(db, docPublicId);
  if (!doc)
    throw new TRPCError({ message: `Doc ${docPublicId} not found`, code: "NOT_FOUND" });
  await assertPermission(db, userId, doc.workspaceId, permission);
  return doc;
}

export const ttmDocRouter = createTRPCRouter({
  list: protectedProcedure
    .meta({
      openapi: {
        summary: "List docs in a workspace",
        method: "GET",
        path: "/workspaces/{workspacePublicId}/docs",
        description: "Lists workspace documents (TTM addition), pinned first then most recently updated",
        tags: ["Docs"],
        protect: true,
      },
    })
    .input(z.object({ workspacePublicId: z.string().min(12) }))
    .output(z.array(docSummarySchema))
    .query(async ({ ctx, input }) => {
      const userId = requireUser(ctx.user?.id);
      const workspace = await workspaceRepo.getByPublicId(ctx.db, input.workspacePublicId);
      if (!workspace)
        throw new TRPCError({ message: "Workspace not found", code: "NOT_FOUND" });
      await assertPermission(ctx.db, userId, workspace.id, "workspace:view");
      return ttmDocRepo.listByWorkspaceId(ctx.db, workspace.id);
    }),

  byId: protectedProcedure
    .meta({
      openapi: {
        summary: "Get a doc",
        method: "GET",
        path: "/docs/{docPublicId}",
        description: "Retrieves a workspace document with its HTML content (TTM addition)",
        tags: ["Docs"],
        protect: true,
      },
    })
    .input(z.object({ docPublicId: z.string().min(12) }))
    .output(docSchema)
    .query(async ({ ctx, input }) => {
      const userId = requireUser(ctx.user?.id);
      const { id: _id, workspaceId: _w, ...doc } = await loadDoc(ctx.db, userId, input.docPublicId, "workspace:view");
      return doc;
    }),

  create: protectedProcedure
    .meta({
      openapi: {
        summary: "Create a doc",
        method: "POST",
        path: "/workspaces/{workspacePublicId}/docs",
        description: "Creates a workspace document (TTM addition). Content is HTML.",
        tags: ["Docs"],
        protect: true,
      },
    })
    .input(
      z.object({
        workspacePublicId: z.string().min(12),
        title: z.string().min(1).max(255),
        content: z.string().max(MAX_CONTENT).optional(),
      }),
    )
    .output(z.object({ publicId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = requireUser(ctx.user?.id);
      const workspace = await workspaceRepo.getByPublicId(ctx.db, input.workspacePublicId);
      if (!workspace)
        throw new TRPCError({ message: "Workspace not found", code: "NOT_FOUND" });
      await assertPermission(ctx.db, userId, workspace.id, "card:create");
      const row = await ttmDocRepo.create(ctx.db, {
        workspaceId: workspace.id,
        title: input.title,
        content: input.content ?? "",
        userId,
      });
      if (!row)
        throw new TRPCError({ message: "Failed to create doc", code: "INTERNAL_SERVER_ERROR" });
      return row;
    }),

  update: protectedProcedure
    .meta({
      openapi: {
        summary: "Update a doc",
        method: "PUT",
        path: "/docs/{docPublicId}",
        description: "Updates a workspace document's title, HTML content or pin (TTM addition)",
        tags: ["Docs"],
        protect: true,
      },
    })
    .input(
      z.object({
        docPublicId: z.string().min(12),
        title: z.string().min(1).max(255).optional(),
        content: z.string().max(MAX_CONTENT).optional(),
        isPinned: z.boolean().optional(),
      }),
    )
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const userId = requireUser(ctx.user?.id);
      const doc = await loadDoc(ctx.db, userId, input.docPublicId, "card:edit");
      await ttmDocRepo.update(ctx.db, doc.id, {
        title: input.title,
        content: input.content,
        isPinned: input.isPinned,
        userId,
      });
      return { success: true };
    }),

  delete: protectedProcedure
    .meta({
      openapi: {
        summary: "Delete a doc",
        method: "DELETE",
        path: "/docs/{docPublicId}",
        description: "Soft-deletes a workspace document (TTM addition)",
        tags: ["Docs"],
        protect: true,
      },
    })
    .input(z.object({ docPublicId: z.string().min(12) }))
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const userId = requireUser(ctx.user?.id);
      const doc = await loadDoc(ctx.db, userId, input.docPublicId, "card:delete");
      await ttmDocRepo.softDelete(ctx.db, doc.id);
      return { success: true };
    }),
});

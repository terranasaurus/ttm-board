// TTM addition (not upstream Kan): add people to a workspace directly, with
// no email or invite link. If they already have an account they're active
// straight away; otherwise the membership waits and activates when they
// create their account (see the user.create.after hook in @kan/auth).
import { randomBytes } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { env } from "next-runtime-env";
import { z } from "zod";

import * as memberRepo from "@kan/db/repository/member.repo";
import * as permissionRepo from "@kan/db/repository/permission.repo";
import * as ttmMemberRepo from "@kan/db/repository/ttmMember.repo";
import * as userRepo from "@kan/db/repository/user.repo";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";
import { createLogger } from "@kan/logger";
import { allowedDomainsFromEnv, isEmailAllowed } from "@kan/shared/ttm-access";

import { createTRPCRouter, protectedProcedure } from "../trpc";
import { assertPermission } from "../utils/permissions";

const log = createLogger("ttm-member");

/** How long an admin-issued password reset link stays valid. */
export const RESET_LINK_TTL_MS = 60 * 60 * 1000;

/** 32 URL-safe characters (~190 bits). */
const newResetToken = () => randomBytes(24).toString("base64url");

export const ttmMemberRouter = createTRPCRouter({
  addDirect: protectedProcedure
    .meta({
      openapi: {
        summary: "Add a member directly",
        method: "POST",
        path: "/workspaces/{workspacePublicId}/members/add",
        description:
          "Adds someone to a workspace without email (TTM addition). Active immediately if they have an account, otherwise when they sign up.",
        tags: ["Workspaces"],
        protect: true,
      },
    })
    .input(
      z.object({
        workspacePublicId: z.string().min(12),
        email: z.string().trim().toLowerCase().email(),
        role: z.enum(["member", "admin"]).default("member"),
      }),
    )
    .output(
      z.object({
        publicId: z.string(),
        status: z.enum(["active", "pending"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;
      if (!userId) throw new TRPCError({ message: "User not authenticated", code: "UNAUTHORIZED" });

      const workspace = await workspaceRepo.getByPublicId(ctx.db, input.workspacePublicId);
      if (!workspace) throw new TRPCError({ message: "Workspace not found", code: "NOT_FOUND" });

      await assertPermission(ctx.db, userId, workspace.id, "member:invite");
      if (input.role === "admin") await assertPermission(ctx.db, userId, workspace.id, "member:edit");

      const allowed = allowedDomainsFromEnv();
      if (!isEmailAllowed(input.email, allowed)) {
        throw new TRPCError({
          message: `Only ${allowed.map((d) => `@${d}`).join(", ")} addresses can be added`,
          code: "BAD_REQUEST",
        });
      }

      const existingUser = await userRepo.getByEmail(ctx.db, input.email);
      const existingMember = await ttmMemberRepo.getLiveByWorkspaceAndEmail(ctx.db, workspace.id, input.email);

      if (existingMember?.status === "active") {
        throw new TRPCError({ message: `${input.email} is already a member of this workspace`, code: "CONFLICT" });
      }

      // A pending row (from an earlier invite or direct add) just needs activating.
      if (existingMember) {
        if (!existingUser) return { publicId: existingMember.publicId, status: "pending" as const };
        await ttmMemberRepo.activateMember(ctx.db, existingMember.id, existingUser.id);
        return { publicId: existingMember.publicId, status: "active" as const };
      }

      const role = await permissionRepo.getRoleByWorkspaceIdAndName(ctx.db, workspace.id, input.role);
      const created = await memberRepo.create(ctx.db, {
        workspaceId: workspace.id,
        email: input.email,
        userId: existingUser?.id ?? null,
        createdBy: userId,
        role: input.role,
        roleId: role?.id ?? null,
        status: existingUser ? "active" : "invited",
      });
      if (!created) throw new TRPCError({ message: "Couldn't add member", code: "INTERNAL_SERVER_ERROR" });

      return { publicId: created.publicId, status: existingUser ? ("active" as const) : ("pending" as const) };
    }),

  /**
   * Email is off, so admins hand out password resets themselves: this returns
   * a one-time link (valid 1 hour) that the admin sends to the person. The
   * token is consumed by Better Auth's own reset endpoint.
   */
  createResetLink: protectedProcedure
    .input(
      z.object({
        workspacePublicId: z.string().min(12),
        memberPublicId: z.string().min(12),
      }),
    )
    .output(z.object({ url: z.string(), expiresAt: z.date(), email: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;
      if (!userId) throw new TRPCError({ message: "User not authenticated", code: "UNAUTHORIZED" });

      const workspace = await workspaceRepo.getByPublicId(ctx.db, input.workspacePublicId);
      if (!workspace) throw new TRPCError({ message: "Workspace not found", code: "NOT_FOUND" });

      // Admin-only: resetting someone's password lets you sign in as them.
      await assertPermission(ctx.db, userId, workspace.id, "member:edit");

      const member = await memberRepo.getByPublicId(ctx.db, input.memberPublicId);
      if (!member || member.workspaceId !== workspace.id || member.deletedAt) {
        throw new TRPCError({ message: "Member not found in this workspace", code: "NOT_FOUND" });
      }
      if (!member.userId || member.status !== "active") {
        throw new TRPCError({
          message: "This person hasn't created their account yet. Ask them to use “Create your account” on the sign-in page.",
          code: "BAD_REQUEST",
        });
      }

      const token = newResetToken();
      const expiresAt = new Date(Date.now() + RESET_LINK_TTL_MS);
      await ttmMemberRepo.replaceResetToken(ctx.db, member.userId, token, expiresAt);
      log.info({ by: userId, for: member.userId, workspaceId: workspace.id }, "Issued admin password reset link");

      const base = (env("NEXT_PUBLIC_BASE_URL") ?? "").replace(/\/$/, "");
      return { url: `${base}/reset-password?token=${token}`, expiresAt, email: member.email };
    }),
});

// TTM addition (not upstream Kan): add people to a workspace directly, with
// no email or invite link. If they already have an account they're active
// straight away; otherwise the membership waits and activates when they
// create their account (see the user.create.after hook in @kan/auth).
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import * as memberRepo from "@kan/db/repository/member.repo";
import * as permissionRepo from "@kan/db/repository/permission.repo";
import * as ttmMemberRepo from "@kan/db/repository/ttmMember.repo";
import * as userRepo from "@kan/db/repository/user.repo";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";
import { allowedDomainsFromEnv, isEmailAllowed } from "@kan/shared/ttm-access";

import { createTRPCRouter, protectedProcedure } from "../trpc";
import { assertPermission } from "../utils/permissions";

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
});

// TTM addition: helpers for adding people to a workspace directly (no email).
import { and, eq, isNull, sql } from "drizzle-orm";

import type { dbClient } from "@kan/db/client";
import { workspaceMembers } from "@kan/db/schema";

const sameEmail = (email: string) =>
  sql`lower(${workspaceMembers.email}) = ${email.trim().toLowerCase()}`;

/** A live (not deleted) membership row for this email in the workspace, any status. */
export const getLiveByWorkspaceAndEmail = async (db: dbClient, workspaceId: number, email: string) => {
  return db.query.workspaceMembers.findFirst({
    where: and(eq(workspaceMembers.workspaceId, workspaceId), sameEmail(email), isNull(workspaceMembers.deletedAt)),
    columns: { id: true, publicId: true, status: true },
  });
};

/**
 * Activate every pending ("invited") membership for this email. Called when
 * the person creates their account, so people added before they signed up
 * land in their workspaces without clicking anything.
 */
export const activatePendingForEmail = async (db: dbClient, email: string, userId: string) => {
  return db
    .update(workspaceMembers)
    .set({ status: "active", userId, updatedAt: new Date() })
    .where(and(sameEmail(email), eq(workspaceMembers.status, "invited"), isNull(workspaceMembers.deletedAt)))
    .returning({ id: workspaceMembers.id, workspaceId: workspaceMembers.workspaceId });
};

/** Re-activate a pending row for someone who already has an account. */
export const activateMember = async (db: dbClient, memberId: number, userId: string) => {
  const [row] = await db
    .update(workspaceMembers)
    .set({ status: "active", userId, updatedAt: new Date() })
    .where(eq(workspaceMembers.id, memberId))
    .returning({ id: workspaceMembers.id, publicId: workspaceMembers.publicId });
  return row;
};

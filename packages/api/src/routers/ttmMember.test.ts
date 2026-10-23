import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@kan/db/repository/member.repo", () => ({ create: vi.fn(), getByPublicId: vi.fn() }));
vi.mock("next-runtime-env", () => ({ env: vi.fn(() => "https://portal.terranthroughmilestones.com/") }));
vi.mock("@kan/db/repository/permission.repo", () => ({ getRoleByWorkspaceIdAndName: vi.fn() }));
vi.mock("@kan/db/repository/ttmMember.repo", () => ({
  getLiveByWorkspaceAndEmail: vi.fn(),
  activateMember: vi.fn(),
  replaceResetToken: vi.fn(),
}));
vi.mock("@kan/db/repository/user.repo", () => ({ getByEmail: vi.fn() }));
vi.mock("@kan/db/repository/workspace.repo", () => ({ getByPublicId: vi.fn() }));
vi.mock("../utils/permissions", () => ({ assertPermission: vi.fn() }));

import * as memberRepo from "@kan/db/repository/member.repo";
import * as permissionRepo from "@kan/db/repository/permission.repo";
import * as ttmMemberRepo from "@kan/db/repository/ttmMember.repo";
import * as userRepo from "@kan/db/repository/user.repo";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";

import { assertPermission } from "../utils/permissions";
import { ttmMemberRouter } from "./ttmMember";

const db = {} as never;
const terran = { id: "terran-id", email: "terran@terranthroughmilestones.com" };
const caller = (user: unknown = terran) => ttmMemberRouter.createCaller({ user, db } as never);
const WS = "bttvdujkgste";

describe("ttmMember.addDirect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.BETTER_AUTH_ALLOWED_DOMAINS = "terranthroughmilestones.com";
    vi.mocked(workspaceRepo.getByPublicId).mockResolvedValue({ id: 1 } as never);
    vi.mocked(permissionRepo.getRoleByWorkspaceIdAndName).mockImplementation((_db, _ws, name) =>
      Promise.resolve({ id: name === "admin" ? 1 : 2 } as never),
    );
    vi.mocked(memberRepo.create).mockResolvedValue({ id: 9, publicId: "newmember123" });
    vi.mocked(ttmMemberRepo.getLiveByWorkspaceAndEmail).mockResolvedValue(undefined);
  });
  afterEach(() => {
    delete process.env.BETTER_AUTH_ALLOWED_DOMAINS;
  });

  it("adds an existing account as an active member straight away", async () => {
    vi.mocked(userRepo.getByEmail).mockResolvedValue({ id: "cass-id", name: "Cassandra", email: "cassandra@terranthroughmilestones.com" });
    const res = await caller().addDirect({ workspacePublicId: WS, email: " Cassandra@TerranThroughMilestones.com " });
    expect(res).toEqual({ publicId: "newmember123", status: "active" });
    expect(memberRepo.create).toHaveBeenCalledWith(db, {
      workspaceId: 1,
      email: "cassandra@terranthroughmilestones.com",
      userId: "cass-id",
      createdBy: "terran-id",
      role: "member",
      roleId: 2,
      status: "active",
    });
    expect(assertPermission).toHaveBeenCalledWith(db, "terran-id", 1, "member:invite");
  });

  it("holds the membership as pending when the person has no account yet", async () => {
    vi.mocked(userRepo.getByEmail).mockResolvedValue(undefined);
    const res = await caller().addDirect({ workspacePublicId: WS, email: "sheila@terranthroughmilestones.com" });
    expect(res.status).toBe("pending");
    expect(vi.mocked(memberRepo.create).mock.calls[0]?.[1]).toMatchObject({ userId: null, status: "invited" });
  });

  it("refuses addresses outside the allowed domain", async () => {
    await expect(caller().addDirect({ workspacePublicId: WS, email: "someone@gmail.com" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect(memberRepo.create).not.toHaveBeenCalled();
  });

  it("refuses someone who is already an active member", async () => {
    vi.mocked(ttmMemberRepo.getLiveByWorkspaceAndEmail).mockResolvedValue({ id: 3, publicId: "existing1234", status: "active" });
    await expect(caller().addDirect({ workspacePublicId: WS, email: "cassandra@terranthroughmilestones.com" })).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });

  it("activates an earlier pending invite instead of duplicating it", async () => {
    vi.mocked(ttmMemberRepo.getLiveByWorkspaceAndEmail).mockResolvedValue({ id: 3, publicId: "pending12345", status: "invited" });
    vi.mocked(userRepo.getByEmail).mockResolvedValue({ id: "cass-id", name: "Cassandra", email: "cassandra@terranthroughmilestones.com" });
    const res = await caller().addDirect({ workspacePublicId: WS, email: "cassandra@terranthroughmilestones.com" });
    expect(res).toEqual({ publicId: "pending12345", status: "active" });
    expect(ttmMemberRepo.activateMember).toHaveBeenCalledWith(db, 3, "cass-id");
    expect(memberRepo.create).not.toHaveBeenCalled();
  });

  it("needs member:edit as well to add an admin", async () => {
    vi.mocked(userRepo.getByEmail).mockResolvedValue(undefined);
    await caller().addDirect({ workspacePublicId: WS, email: "sheila@terranthroughmilestones.com", role: "admin" });
    expect(assertPermission).toHaveBeenCalledWith(db, "terran-id", 1, "member:edit");
    expect(vi.mocked(memberRepo.create).mock.calls[0]?.[1]).toMatchObject({ role: "admin", roleId: 1 });
  });

  it("stops at the permission check for non-admins", async () => {
    vi.mocked(assertPermission).mockRejectedValueOnce(new Error("FORBIDDEN"));
    await expect(caller().addDirect({ workspacePublicId: WS, email: "sheila@terranthroughmilestones.com" })).rejects.toThrow();
    expect(memberRepo.create).not.toHaveBeenCalled();
  });

  it("requires a signed-in user", async () => {
    await expect(caller(null).addDirect({ workspacePublicId: WS, email: "sheila@terranthroughmilestones.com" })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});

describe("ttmMember.createResetLink", () => {
  const input = { workspacePublicId: WS, memberPublicId: "member000001" };
  const activeMember = {
    id: 5,
    publicId: "member000001",
    workspaceId: 1,
    userId: "cass-id",
    email: "cassandra@terranthroughmilestones.com",
    status: "active",
    deletedAt: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(workspaceRepo.getByPublicId).mockResolvedValue({ id: 1 } as never);
    vi.mocked(memberRepo.getByPublicId).mockResolvedValue(activeMember as never);
  });

  it("issues a one-hour, single-token link for an active member", async () => {
    const before = Date.now();
    const res = await caller().createResetLink(input);
    expect(assertPermission).toHaveBeenCalledWith(db, "terran-id", 1, "member:edit");
    const token = new URL(res.url).searchParams.get("token") ?? "";
    expect(res.url.startsWith("https://portal.terranthroughmilestones.com/reset-password?token=")).toBe(true);
    expect(token).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(res.email).toBe("cassandra@terranthroughmilestones.com");
    expect(res.expiresAt.getTime() - before).toBeGreaterThanOrEqual(59 * 60 * 1000);
    expect(res.expiresAt.getTime() - before).toBeLessThanOrEqual(61 * 60 * 1000);
    expect(ttmMemberRepo.replaceResetToken).toHaveBeenCalledWith(db, "cass-id", token, res.expiresAt);
  });

  it("issues a different token every time", async () => {
    const a = await caller().createResetLink(input);
    const b = await caller().createResetLink(input);
    expect(a.url).not.toBe(b.url);
  });

  it("refuses members of another workspace", async () => {
    vi.mocked(memberRepo.getByPublicId).mockResolvedValue({ ...activeMember, workspaceId: 2 } as never);
    await expect(caller().createResetLink(input)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(ttmMemberRepo.replaceResetToken).not.toHaveBeenCalled();
  });

  it("refuses removed members", async () => {
    vi.mocked(memberRepo.getByPublicId).mockResolvedValue({ ...activeMember, deletedAt: new Date() } as never);
    await expect(caller().createResetLink(input)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("explains when the person hasn't created their account yet", async () => {
    vi.mocked(memberRepo.getByPublicId).mockResolvedValue({ ...activeMember, userId: null, status: "invited" } as never);
    await expect(caller().createResetLink(input)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(ttmMemberRepo.replaceResetToken).not.toHaveBeenCalled();
  });

  it("is admin-only (member:edit)", async () => {
    vi.mocked(assertPermission).mockRejectedValueOnce(new Error("FORBIDDEN"));
    await expect(caller().createResetLink(input)).rejects.toThrow();
    expect(ttmMemberRepo.replaceResetToken).not.toHaveBeenCalled();
  });

  it("requires a signed-in user", async () => {
    await expect(caller(null).createResetLink(input)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

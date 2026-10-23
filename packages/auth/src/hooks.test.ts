import { env } from "next-runtime-env";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as memberRepo from "@kan/db/repository/member.repo";
import * as ttmMemberRepo from "@kan/db/repository/ttmMember.repo";
import * as userRepo from "@kan/db/repository/user.repo";

import { createDatabaseHooks } from "./hooks";

vi.mock("next-runtime-env", () => ({
  env: vi.fn(),
}));

vi.mock("@kan/db/repository/member.repo", () => ({
  getByEmailAndStatus: vi.fn(),
  getByPublicId: vi.fn(),
  acceptInvite: vi.fn(),
}));

vi.mock("@kan/db/repository/user.repo", () => ({
  update: vi.fn(),
  getById: vi.fn(),
}));

vi.mock("@kan/db/repository/ttmMember.repo", () => ({
  activatePendingForEmail: vi.fn(),
}));

vi.mock("@kan/email", () => ({
  createSubscriber: vi.fn(),
  triggerSubscriberWorkflow: vi.fn(),
}));

vi.mock("@kan/shared", () => ({
  createS3Client: vi.fn(),
}));

vi.mock("@aws-sdk/client-s3", () => ({
  PutObjectCommand: vi.fn(),
}));

const mockEnv = env as ReturnType<typeof vi.fn>;
const mockGetByEmailAndStatus = memberRepo.getByEmailAndStatus as ReturnType<
  typeof vi.fn
>;

const db = {} as Parameters<typeof createDatabaseHooks>[0];

const fakeUser = {
  id: "user-1",
  createdAt: new Date(),
  updatedAt: new Date(),
  email: "test@example.com",
  emailVerified: false,
  name: "Test User",
};

describe("createDatabaseHooks", () => {
  const hooks = createDatabaseHooks(db);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("user.create.before", () => {
    it("allows sign-up when DISABLE_SIGN_UP is not set", async () => {
      mockEnv.mockReturnValue(undefined);

      const result = await hooks.user.create.before(fakeUser, {});
      expect(result).toBe(true);
      expect(mockGetByEmailAndStatus).not.toHaveBeenCalled();
    });

    it("allows sign-up when DISABLE_SIGN_UP is false", async () => {
      mockEnv.mockImplementation((key: string) =>
        key === "NEXT_PUBLIC_DISABLE_SIGN_UP" ? "false" : undefined,
      );

      const result = await hooks.user.create.before(fakeUser, {});
      expect(result).toBe(true);
      expect(mockGetByEmailAndStatus).not.toHaveBeenCalled();
    });

    it("blocks sign-up when disabled and user has no pending invitation", async () => {
      mockEnv.mockImplementation((key: string) =>
        key === "NEXT_PUBLIC_DISABLE_SIGN_UP" ? "true" : undefined,
      );
      mockGetByEmailAndStatus.mockResolvedValue(undefined);

      const result = await hooks.user.create.before(fakeUser, {});
      expect(result).toBe(false);
      expect(mockGetByEmailAndStatus).toHaveBeenCalledWith(
        db,
        "test@example.com",
        "invited",
      );
    });

    it("allows sign-up when disabled but user has a pending invitation", async () => {
      mockEnv.mockImplementation((key: string) =>
        key === "NEXT_PUBLIC_DISABLE_SIGN_UP" ? "true" : undefined,
      );
      mockGetByEmailAndStatus.mockResolvedValue({
        id: "member-1",
        email: "test@example.com",
        status: "invited",
      });

      const result = await hooks.user.create.before(fakeUser, {});
      expect(result).toBe(true);
      expect(mockGetByEmailAndStatus).toHaveBeenCalledWith(
        db,
        "test@example.com",
        "invited",
      );
    });

    it("blocks sign-up when disabled and invitation exists but domain is not allowed", async () => {
      mockEnv.mockImplementation((key: string) =>
        key === "NEXT_PUBLIC_DISABLE_SIGN_UP" ? "true" : undefined,
      );
      process.env.BETTER_AUTH_ALLOWED_DOMAINS = "acme.com";
      mockGetByEmailAndStatus.mockResolvedValue({
        id: "member-1",
        email: "test@example.com",
        status: "invited",
      });

      const result = await hooks.user.create.before(fakeUser, {});
      expect(result).toBe(false);

      delete process.env.BETTER_AUTH_ALLOWED_DOMAINS;
    });

    // The user.create.before hook fires for ALL sign-up paths including
    // OIDC/social — verify invite bypass works regardless of auth method.
    it("allows OIDC/social sign-up when disabled but user has a pending invitation", async () => {
      mockEnv.mockImplementation((key: string) =>
        key === "NEXT_PUBLIC_DISABLE_SIGN_UP" ? "true" : undefined,
      );
      const oidcUser = {
        ...fakeUser,
        id: "user-oidc",
        email: "sso@corp.com",
        image: "https://provider.com/avatar.jpg",
      };
      mockGetByEmailAndStatus.mockResolvedValue({
        id: "member-2",
        email: "sso@corp.com",
        status: "invited",
      });

      const result = await hooks.user.create.before(oidcUser, {});
      expect(result).toBe(true);
      expect(mockGetByEmailAndStatus).toHaveBeenCalledWith(
        db,
        "sso@corp.com",
        "invited",
      );
    });

    it("blocks OIDC/social sign-up when disabled and user has no pending invitation", async () => {
      mockEnv.mockImplementation((key: string) =>
        key === "NEXT_PUBLIC_DISABLE_SIGN_UP" ? "true" : undefined,
      );
      const oidcUser = {
        ...fakeUser,
        id: "user-oidc",
        email: "random@external.com",
        image: "https://provider.com/avatar.jpg",
      };
      mockGetByEmailAndStatus.mockResolvedValue(undefined);

      const result = await hooks.user.create.before(oidcUser, {});
      expect(result).toBe(false);
      expect(mockGetByEmailAndStatus).toHaveBeenCalledWith(
        db,
        "random@external.com",
        "invited",
      );
    });

    it("allows sign-up when disabled, invitation exists, and domain is allowed", async () => {
      mockEnv.mockImplementation((key: string) =>
        key === "NEXT_PUBLIC_DISABLE_SIGN_UP" ? "true" : undefined,
      );
      process.env.BETTER_AUTH_ALLOWED_DOMAINS = "example.com";
      mockGetByEmailAndStatus.mockResolvedValue({
        id: "member-1",
        email: "test@example.com",
        status: "invited",
      });

      const result = await hooks.user.create.before(fakeUser, {});
      expect(result).toBe(true);

      delete process.env.BETTER_AUTH_ALLOWED_DOMAINS;
    });
  });

  describe("TTM domain lock", () => {
    beforeEach(() => {
      mockEnv.mockReturnValue(undefined);
      process.env.BETTER_AUTH_ALLOWED_DOMAINS = "terranthroughmilestones.com";
    });
    afterEach(() => {
      delete process.env.BETTER_AUTH_ALLOWED_DOMAINS;
    });

    it("blocks sign-up from another domain, case-insensitively allows ours", async () => {
      expect(await hooks.user.create.before({ ...fakeUser, email: "x@gmail.com" }, {})).toBe(false);
      expect(await hooks.user.create.before({ ...fakeUser, email: "Sheila@TerranThroughMilestones.com" }, {})).toBe(true);
    });

    it("refuses a session for an account outside the allowed domains", async () => {
      vi.mocked(userRepo.getById).mockResolvedValue({ email: "old@gmail.com" } as never);
      expect(await hooks.session.create.before({ userId: "u1" }, {})).toBe(false);
      vi.mocked(userRepo.getById).mockResolvedValue({ email: "terran@terranthroughmilestones.com" } as never);
      expect(await hooks.session.create.before({ userId: "u2" }, {})).toBe(true);
    });

    it("refuses a session when the user can't be found", async () => {
      vi.mocked(userRepo.getById).mockResolvedValue(undefined as never);
      expect(await hooks.session.create.before({ userId: "ghost" }, {})).toBe(false);
    });

    it("allows any session when no domains are configured", async () => {
      delete process.env.BETTER_AUTH_ALLOWED_DOMAINS;
      expect(await hooks.session.create.before({ userId: "u1" }, {})).toBe(true);
      expect(userRepo.getById).not.toHaveBeenCalled();
    });

    it("blocks changing an account's email to another domain", async () => {
      expect(await hooks.user.update.before({ email: "me@gmail.com" }, {})).toBe(false);
      expect(await hooks.user.update.before({ email: "me@terranthroughmilestones.com" }, {})).toBe(true);
      expect(await hooks.user.update.before({ name: "New name" }, {})).toBe(true);
    });

    it("activates pending memberships when the account is created", async () => {
      vi.mocked(ttmMemberRepo.activatePendingForEmail).mockResolvedValue([{ id: 7, workspaceId: 1 }]);
      await hooks.user.create.after({ ...fakeUser, email: "sheila@terranthroughmilestones.com" }, {});
      expect(ttmMemberRepo.activatePendingForEmail).toHaveBeenCalledWith(db, "sheila@terranthroughmilestones.com", "user-1");
    });
  });
});

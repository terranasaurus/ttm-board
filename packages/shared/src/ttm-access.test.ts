import { describe, expect, it } from "vitest";

import { isEmailAllowed, parseAllowedDomains } from "./ttm-access";

describe("parseAllowedDomains", () => {
  it("splits, trims, lowercases and drops a leading @", () => {
    expect(parseAllowedDomains(" TerranThroughMilestones.com, @example.org ,")).toEqual([
      "terranthroughmilestones.com",
      "example.org",
    ]);
    expect(parseAllowedDomains(undefined)).toEqual([]);
  });
});

describe("isEmailAllowed", () => {
  const ttm = ["terranthroughmilestones.com"];
  it("allows only the listed domains, case-insensitively", () => {
    expect(isEmailAllowed("cassandra@terranthroughmilestones.com", ttm)).toBe(true);
    expect(isEmailAllowed("Sheila@TERRANTHROUGHMILESTONES.COM", ttm)).toBe(true);
    expect(isEmailAllowed("someone@gmail.com", ttm)).toBe(false);
  });
  it("rejects look-alike and malformed addresses", () => {
    expect(isEmailAllowed("x@terranthroughmilestones.com.evil.io", ttm)).toBe(false);
    expect(isEmailAllowed("x@sub.terranthroughmilestones.com", ttm)).toBe(false);
    expect(isEmailAllowed("terranthroughmilestones.com", ttm)).toBe(false);
    expect(isEmailAllowed("@terranthroughmilestones.com", ttm)).toBe(false);
    expect(isEmailAllowed("", ttm)).toBe(false);
    expect(isEmailAllowed(null, ttm)).toBe(false);
  });
  it("uses the last @ so a quoted local part can't smuggle a domain", () => {
    expect(isEmailAllowed('"a@terranthroughmilestones.com"@gmail.com', ttm)).toBe(false);
  });
  it("allows everything when no domains are configured", () => {
    expect(isEmailAllowed("anyone@anywhere.com", [])).toBe(true);
  });
});

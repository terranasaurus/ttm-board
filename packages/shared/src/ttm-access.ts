// TTM addition: who may use the portal. Accounts are limited to the domains
// in BETTER_AUTH_ALLOWED_DOMAINS (comma-separated). When the variable is
// unset every domain is allowed, which keeps upstream Kan's behaviour.

export function parseAllowedDomains(raw: string | undefined | null): string[] {
  return (raw ?? "")
    .split(",")
    .map((d) => d.trim().toLowerCase().replace(/^@/, ""))
    .filter(Boolean);
}

export function isEmailAllowed(email: string | undefined | null, allowedDomains: string[]): boolean {
  if (allowedDomains.length === 0) return true;
  const at = email?.lastIndexOf("@") ?? -1;
  if (!email || at < 1) return false;
  const domain = email.slice(at + 1).trim().toLowerCase();
  return allowedDomains.includes(domain);
}

/** Server-side: the configured allow-list. */
export function allowedDomainsFromEnv(): string[] {
  return parseAllowedDomains(process.env.BETTER_AUTH_ALLOWED_DOMAINS);
}

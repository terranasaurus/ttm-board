import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { authClient } from "@kan/auth/client";

import Button from "~/components/Button";
import BrandMark from "~/components/BrandMark";
import { PageHead } from "~/components/PageHead";
import PatternedBackground from "~/components/PatternedBackground";
import { inputClass } from "../ui";

const MIN_LENGTH = 8;

/**
 * TTM addition: set a new password from an admin-issued reset link
 * (/reset-password?token=…). Email is off, so the link comes from an admin
 * (Members → … → Password reset link) rather than an inbox.
 */
export default function ResetPasswordView() {
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < MIN_LENGTH) return setError(`Use at least ${MIN_LENGTH} characters.`);
    if (password !== confirm) return setError("The two passwords don't match.");
    setPending(true);
    const { error: err } = await authClient.resetPassword({ newPassword: password, token });
    setPending(false);
    if (err) {
      setError(
        err.code === "INVALID_TOKEN"
          ? "This link has expired or was already used. Ask Terran for a new one."
          : (err.message ?? "Couldn't reset your password. Try again."),
      );
      return;
    }
    setDone(true);
  };

  return (
    <>
      <PageHead title="Reset password | TTM Portal" />
      <main className="h-screen bg-light-100 pt-20 dark:bg-dark-50 sm:pt-0">
        <div className="justify-top flex h-full flex-col items-center px-4 sm:justify-center">
          <div className="z-10 flex w-full flex-col items-center">
            <Link href="/login">
              <BrandMark size="lg" className="mb-6" />
            </Link>
            <p className="mb-10 text-3xl font-bold tracking-tight text-light-1000 dark:text-dark-1000">
              {done ? "Password updated" : "Choose a new password"}
            </p>
            <div className="w-full rounded-lg border border-light-500 bg-light-300 px-4 py-10 dark:border-dark-400 dark:bg-dark-200 sm:max-w-md lg:px-10">
              {!token ? (
                <p className="text-center text-sm text-light-1000 dark:text-dark-1000">
                  This page needs the reset link Terran sent you. Ask for a new one if you can't find it.
                </p>
              ) : done ? (
                <div className="space-y-4 text-center text-sm text-light-1000 dark:text-dark-1000">
                  <p>You can sign in with your new password now.</p>
                  <Button href="/login">Go to sign in</Button>
                </div>
              ) : (
                <form onSubmit={submit} className="space-y-4">
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-light-900 dark:text-dark-900">New password</span>
                    <input
                      type="password"
                      autoComplete="new-password"
                      className={inputClass}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-light-900 dark:text-dark-900">Type it again</span>
                    <input
                      type="password"
                      autoComplete="new-password"
                      className={inputClass}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      required
                    />
                  </label>
                  {error && (
                    <p role="alert" className="text-xs text-red-500">
                      {error}
                    </p>
                  )}
                  <Button type="submit" fullWidth isLoading={pending} disabled={pending}>
                    Save new password
                  </Button>
                </form>
              )}
            </div>
          </div>
          <PatternedBackground />
        </div>
      </main>
    </>
  );
}

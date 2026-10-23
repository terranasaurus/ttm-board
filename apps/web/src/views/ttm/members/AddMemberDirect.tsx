import { useState } from "react";
import { HiOutlineUserPlus } from "react-icons/hi2";

import Button from "~/components/Button";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";
import { inputClass } from "../ui";

/**
 * TTM addition: add someone to the workspace without email or an invite link.
 * Rendered inside Kan's "Add member" modal. Uses its own controls (not a
 * <form>) because the modal is already one.
 */
export function AddMemberDirect({ onDone }: { onDone?: () => void }) {
  const { workspace } = useWorkspace();
  const utils = api.useUtils();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "admin">("member");
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const add = api.ttmMember.addDirect.useMutation({
    onSuccess: async (res, vars) => {
      setMessage({
        tone: "ok",
        text:
          res.status === "active"
            ? `${vars.email} is now a ${vars.role}. They'll see the workspace next time they open the portal.`
            : `${vars.email} is added. They'll join automatically when they create their account with that address.`,
      });
      setEmail("");
      await Promise.all([utils.workspace.byId.invalidate(), utils.board.all.invalidate()]);
      onDone?.();
    },
    onError: (e) => setMessage({ tone: "error", text: e.message }),
  });

  const submit = () => {
    setMessage(null);
    const value = email.trim();
    if (!value || !workspace.publicId) return;
    add.mutate({ workspacePublicId: workspace.publicId, email: value, role });
  };

  return (
    <div className="mb-4 rounded-md border border-light-600 p-3 dark:border-dark-600">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-light-1000 dark:text-dark-1000">
        <HiOutlineUserPlus className="h-4 w-4" /> Add directly, no email needed
      </div>
      <div className="flex flex-wrap gap-2">
        <input
          type="email"
          inputMode="email"
          autoComplete="off"
          aria-label="Email address to add"
          placeholder="name@terranthroughmilestones.com"
          className={`${inputClass} min-w-0 flex-1 basis-48`}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
        />
        <select
          aria-label="Role"
          className={`${inputClass} w-auto`}
          value={role}
          onChange={(e) => setRole(e.target.value as "member" | "admin")}
        >
          <option value="member">Member</option>
          <option value="admin">Admin</option>
        </select>
        <Button type="button" onClick={submit} isLoading={add.isPending} disabled={!email.trim() || add.isPending}>
          Add
        </Button>
      </div>
      {message ? (
        <p
          role="status"
          className={`mt-2 text-xs ${message.tone === "ok" ? "text-ttm-green dark:text-ttm-gold" : "text-red-600 dark:text-red-400"}`}
        >
          {message.text}
        </p>
      ) : (
        <p className="mt-2 text-xs text-light-900 dark:text-dark-900">
          Already signed up? They're added right away. Not yet? They join automatically when they create their account.
        </p>
      )}
    </div>
  );
}

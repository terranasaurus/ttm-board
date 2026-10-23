import { useEffect, useState } from "react";
import { HiMiniCheck, HiOutlineDocumentDuplicate, HiXMark } from "react-icons/hi2";

import Button from "~/components/Button";
import { useModal } from "~/providers/modal";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";

/**
 * TTM addition: Members → … → Password reset link. Creates a one-time link
 * (valid 1 hour) for the admin to send to the person, since email is off.
 */
export function ResetPasswordModal() {
  const { closeModal, entityId, entityLabel, isOpen, modalContentType } = useModal();
  const { workspace } = useWorkspace();
  const [copied, setCopied] = useState(false);
  const [link, setLink] = useState<{ url: string; expiresAt: Date; email: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { mutateAsync } = api.ttmMember.createResetLink.useMutation();
  const open = isOpen && modalContentType === "TTM_RESET_PASSWORD";

  // Kan keeps modals mounted, so make a fresh link every time this one opens
  // (and ignore a response that arrives after it closed or switched person).
  useEffect(() => {
    if (!open || !entityId || !workspace.publicId) return;
    let live = true;
    setLink(null);
    setError(null);
    setCopied(false);
    mutateAsync({ workspacePublicId: workspace.publicId, memberPublicId: entityId })
      .then((res) => live && setLink(res))
      .catch((e: unknown) => live && setError(e instanceof Error ? e.message : "Couldn't create a link."));
    return () => {
      live = false;
    };
  }, [open, entityId, workspace.publicId, mutateAsync]);

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link.url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const expires = link?.expiresAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  return (
    <div className="p-5">
      <div className="flex items-center justify-between pb-4">
        <h2 className="text-sm font-bold text-light-1000 dark:text-dark-1000">Password reset link</h2>
        <button type="button" aria-label="Close" onClick={closeModal} className="rounded p-1 hover:bg-light-300 dark:hover:bg-dark-300">
          <HiXMark size={18} className="text-light-900 dark:text-dark-900" />
        </button>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : !link ? (
        <p className="text-sm text-light-900 dark:text-dark-900">Creating a link…</p>
      ) : (
        <div className="space-y-3 text-sm text-light-1000 dark:text-dark-1000">
          <p>
            Send this link to <strong>{entityLabel || link.email}</strong> by text or chat. It lets them choose a new password,
            works once, and expires at <strong>{expires}</strong>.
          </p>
          <div className="relative">
            <input
              readOnly
              value={link.url}
              aria-label="Reset link"
              onFocus={(e) => e.currentTarget.select()}
              className="block w-full rounded-md border border-light-600 bg-light-50 py-2 pl-3 pr-10 text-xs text-light-900 dark:border-dark-600 dark:bg-dark-200 dark:text-dark-900"
            />
            <button
              type="button"
              onClick={copy}
              aria-label="Copy link"
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-light-900 hover:text-light-1000 dark:text-dark-900"
            >
              {copied ? <HiMiniCheck className="h-5 w-5 text-green-600" /> : <HiOutlineDocumentDuplicate className="h-5 w-5" />}
            </button>
          </div>
          <p className="text-xs text-light-900 dark:text-dark-900">
            Anyone with this link can set the password, so send it only to them. Making a new link cancels this one.
          </p>
        </div>
      )}
      <div className="mt-5 flex justify-end">
        <Button type="button" variant="secondary" onClick={closeModal}>
          Done
        </Button>
      </div>
    </div>
  );
}

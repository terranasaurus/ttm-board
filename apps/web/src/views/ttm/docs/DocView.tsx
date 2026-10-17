import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback, useEffect, useRef, useState } from "react";
import { HiArrowLeft, HiOutlineTrash } from "react-icons/hi2";
import { MdOutlinePushPin, MdPushPin } from "react-icons/md";
import { twMerge } from "tailwind-merge";

import Editor from "~/components/Editor";
import { PageHead } from "~/components/PageHead";
import { api } from "~/utils/api";
import { relativeTime } from "./index";

type SaveState = "idle" | "pending" | "saving" | "saved" | "error";
const AUTOSAVE_MS = 900;

export default function DocView() {
  const router = useRouter();
  const docId = Array.isArray(router.query.docId) ? router.query.docId[0] : router.query.docId;
  const utils = api.useUtils();

  const { data: doc, isLoading, error } = api.ttmDoc.byId.useQuery(
    { docPublicId: docId ?? "" },
    { enabled: !!docId, refetchOnWindowFocus: false },
  );

  const [title, setTitle] = useState("");
  const [save, setSave] = useState<SaveState>("idle");
  const contentRef = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedFor = useRef<string | null>(null);

  useEffect(() => {
    if (doc && loadedFor.current !== doc.publicId) {
      loadedFor.current = doc.publicId;
      setTitle(doc.title);
      contentRef.current = doc.content;
    }
  }, [doc]);

  const update = api.ttmDoc.update.useMutation({
    onMutate: () => setSave("saving"),
    onSuccess: () => {
      setSave("saved");
      void utils.ttmDoc.list.invalidate();
    },
    onError: () => setSave("error"),
  });
  const remove = api.ttmDoc.delete.useMutation({
    onSuccess: async () => {
      await utils.ttmDoc.list.invalidate();
      void router.push("/docs");
    },
  });

  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (!docId || contentRef.current === null) return;
    update.mutate({ docPublicId: docId, content: contentRef.current });
  }, [docId, update]);

  const onContentChange = (html: string) => {
    contentRef.current = html;
    setSave("pending");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, AUTOSAVE_MS);
  };

  // Save any pending edit when leaving the page.
  useEffect(() => {
    const onLeave = () => timer.current && flush();
    router.events.on("routeChangeStart", onLeave);
    window.addEventListener("beforeunload", onLeave);
    return () => {
      router.events.off("routeChangeStart", onLeave);
      window.removeEventListener("beforeunload", onLeave);
    };
  }, [flush, router.events]);

  const saveTitle = () => {
    const t = title.trim();
    if (!docId || !doc || !t || t === doc.title) return;
    update.mutate({ docPublicId: docId, title: t });
  };

  if (isLoading || !docId) {
    return <p className="p-10 text-sm text-light-900 dark:text-dark-900">Loading…</p>;
  }
  if (error || !doc) {
    return (
      <div className="p-10 text-sm text-light-900 dark:text-dark-900">
        Doc not found. <Link href="/docs" className="underline">Back to Docs</Link>
      </div>
    );
  }

  const saveLabel: Record<SaveState, string> = {
    idle: `Edited ${relativeTime(doc.updatedAt)}${doc.updatedByName ? ` by ${doc.updatedByName}` : ""}`,
    pending: "Unsaved changes…",
    saving: "Saving…",
    saved: "Saved",
    error: "Couldn't save. Check your connection.",
  };

  return (
    <>
      <PageHead title={`${title || "Doc"} | TTM Portal`} />
      <div className="h-full overflow-y-auto">
        <div className="m-auto max-w-[820px] px-5 pb-24 pt-6 md:px-10 md:pt-10">
          <div className="mb-6 flex items-center justify-between gap-3 text-sm">
            <Link
              href="/docs"
              className="inline-flex items-center gap-1 font-semibold text-light-900 hover:text-ttm-green dark:text-dark-900 dark:hover:text-dark-1000"
            >
              <HiArrowLeft className="h-4 w-4" /> Docs
            </Link>
            <div className="flex items-center gap-1">
              <span
                className={twMerge(
                  "mr-2 text-xs",
                  save === "error" ? "text-red-600 dark:text-red-400" : "text-light-900 dark:text-dark-900",
                )}
                aria-live="polite"
              >
                {saveLabel[save]}
              </span>
              <button
                type="button"
                title={doc.isPinned ? "Unpin" : "Pin to top"}
                onClick={() =>
                  update.mutate(
                    { docPublicId: docId, isPinned: !doc.isPinned },
                    { onSuccess: () => void utils.ttmDoc.byId.invalidate({ docPublicId: docId }) },
                  )
                }
                className="rounded-md p-2 text-light-900 hover:bg-light-200 dark:text-dark-900 dark:hover:bg-dark-200"
              >
                {doc.isPinned ? <MdPushPin className="h-4 w-4 text-ttm-orange" /> : <MdOutlinePushPin className="h-4 w-4" />}
              </button>
              <button
                type="button"
                title="Delete doc"
                onClick={() => {
                  if (window.confirm(`Delete “${doc.title}”? This can't be undone from the portal.`))
                    remove.mutate({ docPublicId: docId });
                }}
                className="rounded-md p-2 text-light-900 hover:bg-red-500/10 hover:text-red-600 dark:text-dark-900"
              >
                <HiOutlineTrash className="h-4 w-4" />
              </button>
            </div>
          </div>

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
            placeholder="Untitled doc"
            maxLength={255}
            aria-label="Doc title"
            className="mb-4 w-full border-0 bg-transparent p-0 text-3xl font-extrabold tracking-tight text-light-1000 placeholder:text-light-700 focus:ring-0 dark:text-dark-1000 dark:placeholder:text-dark-700"
          />

          <div className="ttm-doc prose prose-sm max-w-none dark:prose-invert prose-headings:font-extrabold prose-headings:text-light-1000 prose-a:text-ttm-green dark:prose-headings:text-dark-1000 dark:prose-a:text-ttm-gold">
            <Editor
              key={doc.publicId}
              content={doc.content}
              onChange={onContentChange}
              onBlur={() => timer.current && flush()}
              workspaceMembers={[]}
              placeholder="Start writing, or type / for headings, lists and more…"
            />
          </div>
        </div>
      </div>
    </>
  );
}

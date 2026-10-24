"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/icons";

/** Toolbar button that copies text and confirms the result. */
export function CopyButton({ text, what }: { text: string; /** e.g. "Request" */ what: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  async function copy() {
    try {
      // Clipboard access needs a secure context (https or localhost).
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("failed");
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 2000);
  }

  return (
    <>
      <button
        type="button"
        onClick={copy}
        className="-mr-2 inline-flex min-h-11 items-center gap-1.5 rounded px-2 font-mono text-[11px] font-medium tracking-wide text-muted uppercase transition-colors hover:bg-surface-2 hover:text-ink"
      >
        <Icon name={state === "copied" ? "check" : "copy"} className="size-3.5" />
        {state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : "Copy"}
      </button>
      <span aria-live="polite" className="sr-only">
        {state === "copied"
          ? `${what} copied to clipboard`
          : state === "failed"
            ? "Copy failed. Select the text manually."
            : ""}
      </span>
    </>
  );
}

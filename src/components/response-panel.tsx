"use client";

import type { Ref } from "react";
import { Icon } from "@/components/icons";
import { LearnAnswer } from "@/components/learn-answer";
import { CodeBlock } from "@/components/ui/code-block";
import { CopyButton } from "@/components/ui/copy-button";
import { eyebrow, panel } from "@/components/ui/styles";
import type { AssistantPreview, AssistantResult, LearnRequest } from "@/lib/assistant/types";
import type { ModeConfig } from "@/lib/modes";

interface ResponsePanelProps {
  mode: ModeConfig;
  /** Local preview, for modes that are not connected to the AI yet. */
  preview?: AssistantPreview | null;
  /** Real result from the server, for connected modes (Learn). */
  result?: AssistantResult<LearnRequest> | null;
  pending: boolean;
  /** Workspaces move focus here after a successful submit. */
  ref?: Ref<HTMLElement>;
}

/**
 * Where the tutor's answer appears. Connected modes show a validated AI
 * answer or a friendly error; preview-only modes show the typed request that
 * would be sent, with a clear notice that nothing left the browser. The
 * empty state outlines the sections an answer has.
 */
export function ResponsePanel({ mode, preview = null, result = null, pending, ref }: ResponsePanelProps) {
  const titleId = `${mode.id}-response-title`;
  const time = preview ? new Date(preview.createdAt).toLocaleTimeString() : null;
  const state = pending
    ? mode.connected
      ? "Thinking"
      : "Preparing"
    : result?.status === "answered"
      ? "AI answer"
      : result?.status === "error"
        ? "Not answered"
        : preview
          ? "Preview"
          : "Waiting";

  const announcement =
    result?.status === "answered"
      ? "CodeBuddy’s answer is ready."
      : result?.status === "error"
        ? result.message
        : preview
          ? `Request preview ready at ${time}. The AI is not connected for this mode yet, so nothing was sent.`
          : "";

  return (
    <section
      ref={ref}
      tabIndex={-1}
      aria-labelledby={titleId}
      aria-busy={pending}
      className={`${panel} lg:sticky lg:top-8`}
    >
      <div className="flex min-h-12 items-center justify-between gap-3 border-b border-line px-5">
        <h2 id={titleId} className="flex items-center gap-2 text-sm font-semibold">
          <Icon name="sparkles" className="size-4 text-mode" />
          Tutor response
        </h2>
        <span className={eyebrow}>{state}</span>
      </div>

      {/* Announced politely to screen readers whenever the panel's content changes. */}
      <p role="status" className="sr-only">
        {pending ? "" : announcement}
      </p>

      <div className="p-5">
        {pending ? (
          <p className="flex items-center gap-2 text-sm text-muted">
            <Icon name="spinner" className="size-4 animate-spin" />
            {mode.connected ? "CodeBuddy is thinking about your question…" : "Preparing your request…"}
          </p>
        ) : result?.status === "answered" ? (
          <LearnAnswer answer={result} />
        ) : result?.status === "error" ? (
          <div className="border-l-2 border-danger bg-surface-2 px-4 py-3 text-sm leading-relaxed">
            <p className="flex items-start gap-2 font-semibold">
              <Icon name="alert" className="mt-0.5 size-4 shrink-0 text-danger" />
              No answer this time
            </p>
            <p className="mt-1 text-muted">{result.message}</p>
          </div>
        ) : preview ? (
          <div className="flex flex-col gap-4">
            <div className="border-l-2 border-status bg-surface-2 px-4 py-3 text-sm leading-relaxed">
              <p className="font-semibold">AI not connected yet: nothing was sent.</p>
              <p className="mt-1 text-muted">
                This is the exact request CodeBuddy prepared. Once {mode.label} is connected it
                goes to <code className="font-mono text-ink">POST {preview.plannedEndpoint}</code>{" "}
                and the answer will include {mode.responseOutline}
              </p>
            </div>
            <CodeBlock
              title="request.json"
              language="json"
              label="Request preview as JSON"
              code={JSON.stringify(preview.request, null, 2)}
              actions={<CopyButton text={JSON.stringify(preview.request, null, 2)} what="Request" />}
            />
            <p className="text-xs text-muted">Prepared at {time}</p>
          </div>
        ) : (
          <EmptyState mode={mode} />
        )}
      </div>
    </section>
  );
}

function EmptyState({ mode }: { mode: ModeConfig }) {
  return (
    <div>
      <p className="font-display text-xl font-semibold">
        {mode.connected ? "No question yet" : "Nothing sent yet"}
      </p>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">
        {mode.connected ? (
          <>
            Fill in the form and choose{" "}
            <strong className="font-semibold text-ink">Ask CodeBuddy</strong>. Your question is
            sent to Claude, and the answer appears here.
          </>
        ) : (
          <>
            Fill in the form and choose{" "}
            <strong className="font-semibold text-ink">Preview request</strong>. {mode.label}{" "}
            isn&apos;t connected to the AI yet, so you&apos;ll see the exact request CodeBuddy
            would send instead of an answer.
          </>
        )}
      </p>
      <p className={`${eyebrow} mt-6 mb-2`}>
        {mode.connected ? "Your answer will include" : "A connected answer will include"}
      </p>
      <ol className="divide-y divide-line border-y border-line">
        {mode.responseSections.map((section, i) => (
          <li key={section} className="flex items-center gap-3 py-2.5 text-sm">
            <span className="w-5 font-mono text-xs text-subtle tabular-nums">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="font-medium">{section}</span>
            {/* Placeholder bar hinting at future content; purely decorative. */}
            <span aria-hidden="true" className="ml-auto h-1.5 w-1/4 rounded-full bg-surface-2" />
          </li>
        ))}
      </ol>
    </div>
  );
}

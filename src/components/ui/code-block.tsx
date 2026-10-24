import type { ReactNode } from "react";
import { Icon } from "@/components/icons";

interface CodeBlockProps {
  code: string;
  /** Caption in the toolbar, e.g. a file name. */
  title: string;
  /** Short language tag shown on the right of the toolbar. */
  language?: string;
  /** 1-based line numbers to highlight, e.g. the line an error points at. */
  highlight?: readonly number[];
  /** Extra toolbar content, such as a copy button. */
  actions?: ReactNode;
  /** Accessible name for the scrollable code region. */
  label?: string;
  className?: string;
}

/**
 * Read-only code with an editor-like toolbar and line numbers. The gutter is
 * a separate `aria-hidden` column, so screen readers read only the code.
 */
export function CodeBlock({
  code,
  title,
  language,
  highlight = [],
  actions,
  label,
  className = "",
}: CodeBlockProps) {
  const lines = code.replace(/\n$/, "").split("\n");

  return (
    <div className={`overflow-hidden rounded-md border border-line bg-code ${className}`}>
      <div className="flex min-h-11 items-center justify-between gap-3 border-b border-line px-3">
        <span className="flex min-w-0 items-center gap-2 font-mono text-xs text-muted">
          <Icon name="file" className="size-3.5 shrink-0" />
          <span className="truncate">{title}</span>
        </span>
        <span className="flex items-center gap-2">
          {language && (
            <span className="font-mono text-[11px] font-medium tracking-wide text-subtle uppercase">
              {language}
            </span>
          )}
          {actions}
        </span>
      </div>
      <div
        tabIndex={0}
        role="region"
        aria-label={label ?? title}
        className="flex overflow-x-auto py-3 font-mono text-[13px] leading-6"
      >
        <div aria-hidden="true" className="sticky left-0 shrink-0 bg-code pr-3 pl-3 text-right text-subtle select-none">
          {lines.map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        <pre className="min-w-0 flex-1 pr-4">
          <code>
            {lines.map((line, i) => (
              <span
                key={i}
                className={`block ${highlight.includes(i + 1) ? "-mx-1 rounded-sm bg-highlight px-1" : ""}`}
              >
                {line || " "}
              </span>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
}

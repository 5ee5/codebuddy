"use client";

import { useState } from "react";
import { flushSync } from "react-dom";
import { Icon } from "@/components/icons";
import { Field } from "@/components/ui/field";
import { buttonGhost, control } from "@/components/ui/styles";
import { saveAccessCode, useSavedAccessCode } from "@/lib/access-code-store";

/*
 * The shared access code for the paid AI modes. Once a request succeeds the
 * code is remembered for this browser tab (see access-code-store), so it
 * works in Learn and Debug without typing it again.
 */

function focus(id: string) {
  document.getElementById(id)?.focus();
}

export function useAccessCode(fieldId: string) {
  const savedCode = useSavedAccessCode();
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string>();
  const showField = !savedCode || editing;

  return {
    /** The code to send, or null after flagging the empty field and focusing it. */
    take(missingMessage: string): string | null {
      const code = showField ? draft.trim() : savedCode;
      if (!code) {
        setError(missingMessage);
        focus(fieldId);
        return null;
      }
      setError(undefined);
      return code;
    },
    /** The server accepted the code: remember it for this tab. */
    accepted(code: string) {
      saveAccessCode(code);
      setEditing(false);
      setDraft("");
    },
    /** The server rejected the code: forget it and reopen the field with the message. */
    rejected(code: string, message: string) {
      saveAccessCode("");
      flushSync(() => {
        setEditing(true);
        setDraft(code);
        setError(message);
      });
      focus(fieldId);
    },
    fieldProps: {
      id: fieldId,
      showField,
      value: draft,
      error,
      onValueChange: setDraft,
      onChange: () => {
        flushSync(() => setEditing(true));
        focus(fieldId);
      },
    },
  };
}

interface AccessCodeFieldProps {
  id: string;
  showField: boolean;
  value: string;
  error?: string;
  onValueChange: (value: string) => void;
  /** "Change" was pressed on the saved-code row. */
  onChange: () => void;
}

export function AccessCodeField({ id, showField, value, error, onValueChange, onChange }: AccessCodeFieldProps) {
  if (!showField) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-5 text-sm">
        <p className="flex items-center gap-2 text-muted">
          <Icon name="check" className="size-4 text-mode" />
          Access code saved for this tab
        </p>
        <button type="button" onClick={onChange} className={buttonGhost}>
          Change
        </button>
      </div>
    );
  }
  return (
    <Field
      id={id}
      label="Access code"
      hint="Ask the person running this CodeBuddy server. It’s remembered for this browser tab only."
      error={error}
    >
      {(props) => (
        <input
          {...props}
          type="password"
          name="accessCode"
          autoComplete="off"
          spellCheck={false}
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          className={`${control} min-h-11 font-mono`}
        />
      )}
    </Field>
  );
}

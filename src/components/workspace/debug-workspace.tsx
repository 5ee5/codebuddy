"use client";

import { useRef, useState, type FormEvent } from "react";
import { Icon } from "@/components/icons";
import { ResponsePanel } from "@/components/response-panel";
import { CodeEditor } from "@/components/ui/code-editor";
import { Field, Select } from "@/components/ui/field";
import { buttonGhost, buttonSecondary, panel } from "@/components/ui/styles";
import { FormFooter } from "@/components/workspace/form-footer";
import { previewRequest } from "@/lib/assistant/client";
import type {
  AssistantPreview,
  DebugRequest,
  ProgrammingLanguage,
} from "@/lib/assistant/types";
import { hasErrors, validateDebug } from "@/lib/assistant/validation";
import { LANGUAGE_EXTENSIONS, LANGUAGE_LABELS, LANGUAGES } from "@/lib/languages";
import { getMode } from "@/lib/modes";

const mode = getMode("debug");

const EXAMPLE = {
  language: "python" as ProgrammingLanguage,
  code: `numbers = [10, 20, 30]

for i in range(4):
    print(numbers[i])
`,
  errorMessage: `Traceback (most recent call last):
  File "main.py", line 4, in <module>
    print(numbers[i])
IndexError: list index out of range`,
};

export function DebugWorkspace() {
  const [language, setLanguage] = useState<ProgrammingLanguage>("python");
  const [code, setCode] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [preview, setPreview] = useState<AssistantPreview<DebugRequest> | null>(null);
  const [pending, setPending] = useState(false);
  const panelRef = useRef<HTMLElement>(null);

  const request: DebugRequest = {
    mode: "debug",
    language,
    code: code.trimEnd(),
    errorMessage: errorMessage.trim(),
  };
  const errors = submitted ? validateDebug(request) : {};

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    const result = validateDebug(request);
    if (hasErrors(result)) {
      setPreview(null);
      const firstInvalid = result.code ? "debug-code" : "debug-error";
      document.getElementById(firstInvalid)?.focus();
      return;
    }
    setPending(true);
    try {
      setPreview(await previewRequest(request));
      panelRef.current?.focus();
    } finally {
      setPending(false);
    }
  }

  function loadExample() {
    setLanguage(EXAMPLE.language);
    setCode(EXAMPLE.code);
    setErrorMessage(EXAMPLE.errorMessage);
  }

  function handleClear() {
    setCode("");
    setErrorMessage("");
    setSubmitted(false);
    setPreview(null);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-start lg:gap-8">
      <form noValidate onSubmit={handleSubmit} className={panel}>
        <div className="flex flex-col gap-7 p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="sm:w-60">
              <Field id="debug-language" label="Programming language">
                {(props) => (
                  <Select
                    {...props}
                    name="language"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as ProgrammingLanguage)}
                  >
                    {LANGUAGES.map((lang) => (
                      <option key={lang} value={lang}>
                        {LANGUAGE_LABELS[lang]}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            </div>
            <button type="button" onClick={loadExample} className={buttonSecondary}>
              <Icon name="lightbulb" className="size-4" />
              Load an example
            </button>
          </div>

          <Field
            id="debug-code"
            label="Your code"
            hint="Paste the smallest piece of code that shows the problem. Tab moves to the next field, so indent with spaces."
            error={errors.code}
          >
            {(props) => (
              <CodeEditor
                {...props}
                name="code"
                rows={10}
                title={`main.${LANGUAGE_EXTENSIONS[language]}`}
                language={LANGUAGE_LABELS[language]}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={"numbers = [1, 2, 3]\nprint(numbers[3])"}
              />
            )}
          </Field>

          <Field
            id="debug-error"
            label="Error message"
            optional
            hint="Copy the full error text, including the line number. Leave it empty if the program runs but gives the wrong result."
            error={errors.errorMessage}
          >
            {(props) => (
              <CodeEditor
                {...props}
                name="errorMessage"
                rows={4}
                title="error output"
                value={errorMessage}
                onChange={(e) => setErrorMessage(e.target.value)}
                placeholder="IndexError: list index out of range"
              />
            )}
          </Field>
        </div>

        <FormFooter
          pending={pending}
          secondary={
            <button type="button" onClick={handleClear} className={buttonGhost}>
              <Icon name="reset" className="size-4" />
              Clear
            </button>
          }
        />
      </form>

      <ResponsePanel ref={panelRef} mode={mode} preview={preview} pending={pending} />
    </div>
  );
}

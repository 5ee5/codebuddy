"use client";

import { useRef, useState, type FormEvent } from "react";
import { Icon } from "@/components/icons";
import { ResponsePanel } from "@/components/response-panel";
import { CodeBlock } from "@/components/ui/code-block";
import { CodeEditor } from "@/components/ui/code-editor";
import { Field } from "@/components/ui/field";
import { RadioCards, type RadioCardOption } from "@/components/ui/radio-cards";
import { buttonGhost, eyebrow, panel } from "@/components/ui/styles";
import { FormFooter } from "@/components/workspace/form-footer";
import { previewRequest } from "@/lib/assistant/client";
import type { AssistantPreview, PracticeRequest } from "@/lib/assistant/types";
import { hasErrors, validatePractice } from "@/lib/assistant/validation";
import {
  DIFFICULTY_LABELS,
  EXERCISES,
  getExercise,
  type Difficulty,
  type Exercise,
} from "@/lib/exercises";
import { LANGUAGE_EXTENSIONS, LANGUAGE_LABELS } from "@/lib/languages";
import { getMode } from "@/lib/modes";

const mode = getMode("practice");

const DIFFICULTY_LEVEL: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3 };

/** Three small bars plus a text label; the bars are decorative. */
function DifficultyMeter({ difficulty }: { difficulty: Difficulty }) {
  const level = DIFFICULTY_LEVEL[difficulty];
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 font-mono text-[11px] font-medium tracking-wide text-muted uppercase">
      <span aria-hidden="true" className="flex items-end gap-0.5">
        {[1, 2, 3].map((n) => (
          <span
            key={n}
            className={`w-1 rounded-sm ${n <= level ? "bg-mode" : "bg-line-strong"}`}
            style={{ height: `${4 + n * 3}px` }}
          />
        ))}
      </span>
      <span className="sr-only">Difficulty: </span>
      {DIFFICULTY_LABELS[difficulty]}
    </span>
  );
}

const EXERCISE_OPTIONS: readonly RadioCardOption<string>[] = EXERCISES.map((ex) => ({
  value: ex.id,
  label: ex.title,
  description: LANGUAGE_LABELS[ex.language],
  meta: <DifficultyMeter difficulty={ex.difficulty} />,
}));

export function PracticeWorkspace() {
  const [exerciseId, setExerciseId] = useState(EXERCISES[0].id);
  // One draft per exercise, so switching exercises never throws work away.
  const [solutions, setSolutions] = useState<Record<string, string>>({});
  const [hintsOpened, setHintsOpened] = useState<Record<string, number[]>>({});
  const [submitted, setSubmitted] = useState(false);
  const [preview, setPreview] = useState<AssistantPreview<PracticeRequest> | null>(null);
  const [pending, setPending] = useState(false);
  const panelRef = useRef<HTMLElement>(null);

  const exercise: Exercise = getExercise(exerciseId) ?? EXERCISES[0];
  const solution = solutions[exercise.id] ?? exercise.starterCode;
  const opened = hintsOpened[exercise.id] ?? [];
  const extension = LANGUAGE_EXTENSIONS[exercise.language];

  const request: PracticeRequest = {
    mode: "practice",
    exerciseId: exercise.id,
    language: exercise.language,
    solution: solution.trimEnd(),
    hintsOpened: opened.length,
  };
  const errors = submitted ? validatePractice(request, exercise.starterCode) : {};

  function setSolution(value: string) {
    setSolutions((prev) => ({ ...prev, [exercise.id]: value }));
  }

  function markHintOpened(index: number) {
    setHintsOpened((prev) => {
      const current = prev[exercise.id] ?? [];
      return current.includes(index) ? prev : { ...prev, [exercise.id]: [...current, index] };
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    if (hasErrors(validatePractice(request, exercise.starterCode))) {
      setPreview(null);
      document.getElementById("practice-solution")?.focus();
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

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-start lg:gap-8">
      <form noValidate onSubmit={handleSubmit} className={panel}>
        <div className="divide-y divide-line">
          <div className="p-5 sm:p-6">
            <RadioCards
              name="exercise"
              legend="Choose an exercise"
              options={EXERCISE_OPTIONS}
              value={exercise.id}
              onChange={(id) => {
                setExerciseId(id);
                setSubmitted(false);
                setPreview(null);
              }}
              columns="sm:grid-cols-2"
            />
          </div>

          <article aria-labelledby="practice-exercise-title" className="flex flex-col gap-6 p-5 sm:p-6">
            <div>
              <p className={eyebrow}>Exercise brief</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                <h2 id="practice-exercise-title" className="font-display text-2xl font-semibold">
                  {exercise.title}
                </h2>
                <DifficultyMeter difficulty={exercise.difficulty} />
                <span className="font-mono text-[11px] font-medium tracking-wide text-muted uppercase">
                  <span className="sr-only">Language: </span>
                  {LANGUAGE_LABELS[exercise.language]}
                </span>
              </div>
              <p className="mt-3 leading-relaxed text-muted">{exercise.description}</p>
            </div>

            <div>
              <h3 className="text-sm font-semibold">Your solution should</h3>
              <ul className="mt-2 flex flex-col gap-2 text-sm leading-relaxed">
                {exercise.requirements.map((req) => (
                  <li key={req} className="flex gap-2.5">
                    <Icon name="check" className="mt-0.5 size-4 shrink-0 text-mode" />
                    {req}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-sm font-semibold">Stuck? Open a hint</h3>
                <p className="font-mono text-xs text-muted tabular-nums">
                  {opened.length} of {exercise.hints.length} used
                </p>
              </div>
              {/* Keyed by exercise so open/closed state resets per exercise. */}
              <div key={exercise.id} className="mt-2 divide-y divide-line border-y border-line">
                {exercise.hints.map((hint, i) => (
                  <details
                    key={hint}
                    onToggle={(e) => {
                      if (e.currentTarget.open) markHintOpened(i);
                    }}
                    className="group"
                  >
                    <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 py-2 text-sm font-medium transition-colors hover:text-mode [&::-webkit-details-marker]:hidden">
                      <span className="flex items-center gap-2">
                        <Icon name="lightbulb" className="size-4 text-mode" />
                        Hint {i + 1}
                      </span>
                      <Icon
                        name="chevronDown"
                        className="size-4 text-muted transition-transform duration-150 group-open:rotate-180"
                      />
                    </summary>
                    <p className="pb-3 pl-6 text-sm leading-relaxed">{hint}</p>
                  </details>
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold">Starter code</h3>
              <CodeBlock
                title={`starter.${extension}`}
                language={LANGUAGE_LABELS[exercise.language]}
                label="Starter code"
                code={exercise.starterCode}
              />
            </div>
          </article>

          <div className="p-5 sm:p-6">
            <Field
              id="practice-solution"
              label="Your solution"
              hint={`Starts from the starter code. Write ${LANGUAGE_LABELS[exercise.language]}; Tab moves to the next field, so indent with spaces.`}
              error={errors.solution}
            >
              {(props) => (
                <CodeEditor
                  {...props}
                  name="solution"
                  rows={12}
                  title={`solution.${extension}`}
                  language={LANGUAGE_LABELS[exercise.language]}
                  value={solution}
                  onChange={(e) => setSolution(e.target.value)}
                />
              )}
            </Field>
          </div>
        </div>

        <FormFooter
          pending={pending}
          secondary={
            <button
              type="button"
              onClick={() => {
                setSolution(exercise.starterCode);
                setSubmitted(false);
                setPreview(null);
              }}
              className={buttonGhost}
            >
              <Icon name="reset" className="size-4" />
              Reset to starter code
            </button>
          }
        />
      </form>

      <ResponsePanel ref={panelRef} mode={mode} preview={preview} pending={pending} />
    </div>
  );
}

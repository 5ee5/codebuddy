import type {
  CodeSnippet,
  DebugRequest,
  FieldErrors,
  LearnerLevel,
  LearnRequest,
  LearnResponse,
  PracticeRequest,
} from "@/lib/assistant/types";
import { LANGUAGES } from "@/lib/languages";

/*
 * Pure validation for each request type. The workspaces use these before
 * calling the assistant, and the API routes run the same functions on the
 * server so both sides enforce identical rules.
 */
export const LIMITS = {
  questionMin: 10,
  questionMax: 2000,
  codeMax: 10000,
  errorMessageMax: 4000,
  solutionMax: 10000,
  topicMax: 60,
} as const;

/*
 * Upper bounds for a Learn answer. They keep answers short enough for a
 * beginner to read and fit the server's 2,000-token output budget.
 */
export const LEARN_OUTPUT_LIMITS = {
  explanationMax: 2500,
  keyPointsMin: 1,
  keyPointsMax: 5,
  followUpMax: 3,
  itemMax: 200,
  exampleCodeMax: 1500,
} as const;

export const LEARNER_LEVELS: readonly LearnerLevel[] = ["beginner", "basics", "comfortable"];

export function validateLearn(req: LearnRequest): FieldErrors<LearnRequest> {
  const errors: FieldErrors<LearnRequest> = {};
  const question = req.question.trim();
  if (!question) {
    errors.question = "Type a question, or pick an example topic above.";
  } else if (question.length < LIMITS.questionMin) {
    errors.question = `Add a little more detail: at least ${LIMITS.questionMin} characters.`;
  } else if (question.length > LIMITS.questionMax) {
    errors.question = `Keep your question under ${LIMITS.questionMax} characters.`;
  }
  return errors;
}

export function validateDebug(req: DebugRequest): FieldErrors<DebugRequest> {
  const errors: FieldErrors<DebugRequest> = {};
  const code = req.code.trim();
  const errorMessage = req.errorMessage.trim();
  if (!code && !errorMessage) {
    errors.code = "Paste the code that isn’t working, the error message, or both.";
  }
  if (req.code.length > LIMITS.codeMax) {
    errors.code = `Code is too long: keep it under ${LIMITS.codeMax} characters.`;
  }
  if (req.errorMessage.length > LIMITS.errorMessageMax) {
    errors.errorMessage = `Error message is too long: keep it under ${LIMITS.errorMessageMax} characters.`;
  }
  return errors;
}

export function validatePractice(
  req: PracticeRequest,
  starterCode: string,
): FieldErrors<PracticeRequest> {
  const errors: FieldErrors<PracticeRequest> = {};
  const solution = req.solution.trim();
  if (!solution) {
    errors.solution = "Write your solution before asking for feedback.";
  } else if (solution === starterCode.trim()) {
    errors.solution = "This is still the starter code. Change it to add your solution.";
  } else if (req.solution.length > LIMITS.solutionMax) {
    errors.solution = `Solution is too long: keep it under ${LIMITS.solutionMax} characters.`;
  }
  return errors;
}

export function hasErrors(errors: object): boolean {
  return Object.keys(errors).length > 0;
}

// ------------------------------------------------- Untrusted JSON parsing ----

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isText(value: unknown, max: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= max;
}

function isTextList(value: unknown, min: number, max: number, itemMax: number): value is string[] {
  return (
    Array.isArray(value) &&
    value.length >= min &&
    value.length <= max &&
    value.every((item) => isText(item, itemMax))
  );
}

/**
 * Checks the shape of a Learn request body that arrived as untrusted JSON.
 * Returns a fresh object without unknown keys, or `null` if the shape is
 * wrong. Content rules (length and so on) stay in `validateLearn`.
 */
export function parseLearnRequest(body: unknown): LearnRequest | null {
  if (!isRecord(body) || body.mode !== "learn") return null;
  const { question, level, topic } = body;
  if (typeof question !== "string") return null;
  if (!LEARNER_LEVELS.includes(level as LearnerLevel)) return null;
  if (topic !== undefined && !isText(topic, LIMITS.topicMax)) return null;
  return {
    mode: "learn",
    question: question.trim(),
    level: level as LearnerLevel,
    ...(topic !== undefined ? { topic: (topic as string).trim() } : {}),
  };
}

/**
 * Checks model output against the `LearnResponse` contract. The model is
 * asked for `example: null` when it has no example; that becomes an absent
 * field. Returns `null` for anything that does not match exactly.
 */
export function parseLearnResponse(value: unknown): LearnResponse | null {
  if (!isRecord(value)) return null;
  const L = LEARN_OUTPUT_LIMITS;
  const { explanation, keyPoints, followUpQuestions, example } = value;
  if (!isText(explanation, L.explanationMax)) return null;
  if (!isTextList(keyPoints, L.keyPointsMin, L.keyPointsMax, L.itemMax)) return null;
  if (!isTextList(followUpQuestions, 0, L.followUpMax, L.itemMax)) return null;

  let snippet: CodeSnippet | undefined;
  if (example !== null && example !== undefined) {
    if (!isRecord(example)) return null;
    const { language, code } = example;
    if (!LANGUAGES.includes(language as CodeSnippet["language"])) return null;
    if (!isText(code, L.exampleCodeMax)) return null;
    snippet = { language: language as CodeSnippet["language"], code };
  }

  return {
    mode: "learn",
    explanation: explanation.trim(),
    ...(snippet ? { example: snippet } : {}),
    keyPoints: keyPoints.map((point) => point.trim()),
    followUpQuestions: followUpQuestions.map((question) => question.trim()),
  };
}

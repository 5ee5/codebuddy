/*
 * Request/response contracts between the UI and the AI assistant.
 *
 * Every request carries a `mode` discriminant, so `AssistantRequest` can be
 * narrowed with a simple `switch (request.mode)`, both in the browser and in
 * the server-side route handlers. Learn is connected to the Claude API
 * (`/api/learn`); Debug and Practice still produce local previews only.
 */
import type { ModeId } from "@/lib/modes";

export type LearnerLevel = "beginner" | "basics" | "comfortable";

export type ProgrammingLanguage =
  | "python"
  | "javascript"
  | "java"
  | "cpp"
  | "csharp"
  | "other";

export interface CodeSnippet {
  language: ProgrammingLanguage;
  code: string;
}

// ---------------------------------------------------------------- Learn ----

export interface LearnRequest {
  mode: "learn";
  question: string;
  level: LearnerLevel;
  /** Set when the learner started from one of the example-topic chips. */
  topic?: string;
}

export interface LearnResponse {
  mode: "learn";
  explanation: string;
  example?: CodeSnippet;
  keyPoints: string[];
  followUpQuestions: string[];
}

// ---------------------------------------------------------------- Debug ----

export interface DebugRequest {
  mode: "debug";
  language: ProgrammingLanguage;
  code: string;
  errorMessage: string;
}

export interface DebugResponse {
  mode: "debug";
  summary: string;
  likelyCause: string;
  suggestedFix: string;
  fixedCode?: CodeSnippet;
  tips: string[];
}

// ------------------------------------------------------------- Practice ----

export interface PracticeRequest {
  mode: "practice";
  exerciseId: string;
  language: ProgrammingLanguage;
  solution: string;
  /** How many hints the learner opened, useful for future learning history. */
  hintsOpened: number;
}

export interface PracticeResponse {
  mode: "practice";
  verdict: "correct" | "almost" | "incorrect";
  feedback: string;
  nextHint?: string;
  improvedSolution?: CodeSnippet;
}

// ---------------------------------------------------------------- Union ----

export type AssistantRequest = LearnRequest | DebugRequest | PracticeRequest;
export type AssistantResponse = LearnResponse | DebugResponse | PracticeResponse;

/** The response type that belongs to a given request type. */
export type ResponseFor<R extends AssistantRequest> = Extract<
  AssistantResponse,
  { mode: R["mode"] }
>;

/**
 * What the local stub returns for modes that are not connected yet. Nothing
 * leaves the browser; `status: "not-connected"` keeps it distinct from a real
 * `AssistantAnswer`.
 */
export interface AssistantPreview<R extends AssistantRequest = AssistantRequest> {
  status: "not-connected";
  mode: ModeId;
  request: R;
  /** Where the request will be sent once the backend exists. */
  plannedEndpoint: string;
  createdAt: string;
}

/** Field-level validation messages, keyed by request property. */
export type FieldErrors<R extends AssistantRequest> = Partial<
  Record<Exclude<keyof R, "mode">, string>
>;

// -------------------------------------------------------- Live results ----

/** A genuine answer produced by the AI model and validated on the server. */
export interface AssistantAnswer<R extends AssistantRequest = AssistantRequest> {
  status: "answered";
  mode: R["mode"];
  response: ResponseFor<R>;
  /** The model that produced the answer, shown to the learner. */
  model: string;
  createdAt: string;
}

export type AssistantErrorCode =
  | "invalid_request"
  | "access_denied"
  | "not_configured"
  | "rate_limited"
  | "refused"
  | "malformed_output"
  | "unavailable"
  | "timeout"
  | "network";

/** A safe, user-facing failure. Never carries provider details. */
export interface AssistantFailure<R extends AssistantRequest = AssistantRequest> {
  status: "error";
  code: AssistantErrorCode;
  message: string;
  fieldErrors?: FieldErrors<R>;
}

export type AssistantResult<R extends AssistantRequest = AssistantRequest> =
  | AssistantAnswer<R>
  | AssistantFailure<R>;

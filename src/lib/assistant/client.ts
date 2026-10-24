import { failure, FAILURE_MESSAGES } from "@/lib/assistant/errors";
import type {
  AssistantErrorCode,
  AssistantPreview,
  AssistantRequest,
  AssistantResult,
  LearnRequest,
} from "@/lib/assistant/types";
import { parseLearnResponse } from "@/lib/assistant/validation";

/** Where a mode's server route lives. Only `/api/learn` exists so far. */
export function endpointFor(mode: AssistantRequest["mode"]): string {
  return `/api/${mode}`;
}

/** The browser gives up a little after the server's own provider timeout. */
export const CLIENT_TIMEOUT_MS = 70_000;

/**
 * Local stand-in for modes that are not connected yet (Debug and Practice).
 * It makes no network calls: it only echoes the typed request back so the UI
 * can show exactly what would be sent.
 */
export async function previewRequest<R extends AssistantRequest>(
  request: R,
): Promise<AssistantPreview<R>> {
  return {
    status: "not-connected",
    mode: request.mode,
    request,
    plannedEndpoint: endpointFor(request.mode),
    createdAt: new Date().toISOString(),
  };
}

const ERROR_CODES = Object.keys(FAILURE_MESSAGES) as AssistantErrorCode[];

/**
 * Sends a Learn question to the server route. The access code travels only in
 * the `Authorization` header, never in the URL. Never throws: network errors,
 * timeouts and unexpected replies all become a typed `AssistantFailure`.
 */
export async function askLearn(
  request: LearnRequest,
  accessCode: string,
  signal?: AbortSignal,
): Promise<AssistantResult<LearnRequest>> {
  const timeout = AbortSignal.timeout(CLIENT_TIMEOUT_MS);
  // `AbortSignal.any` is missing in older browsers; the caller's signal wins there.
  const combined =
    signal && typeof AbortSignal.any === "function"
      ? AbortSignal.any([signal, timeout])
      : (signal ?? timeout);

  let res: Response;
  try {
    res = await fetch(endpointFor("learn"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessCode}`,
      },
      body: JSON.stringify(request),
      signal: combined,
      cache: "no-store",
    });
  } catch {
    return failure(timeout.aborted ? "timeout" : "network");
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return failure(timeout.aborted ? "timeout" : "unavailable");
  }
  return readLearnResult(body);
}

/** Accepts only well-formed results from the server, re-checking answers. */
function readLearnResult(body: unknown): AssistantResult<LearnRequest> {
  if (typeof body !== "object" || body === null) return failure("unavailable");
  const data = body as Record<string, unknown>;

  if (data.status === "answered") {
    const response = parseLearnResponse(data.response);
    if (!response || typeof data.model !== "string" || typeof data.createdAt !== "string") {
      return failure("malformed_output");
    }
    return {
      status: "answered",
      mode: "learn",
      response,
      model: data.model,
      createdAt: data.createdAt,
    };
  }

  if (data.status === "error" && ERROR_CODES.includes(data.code as AssistantErrorCode)) {
    const code = data.code as AssistantErrorCode;
    const result = failure<LearnRequest>(
      code,
      typeof data.message === "string" ? data.message : FAILURE_MESSAGES[code],
    );
    const fieldErrors = data.fieldErrors as Record<string, unknown> | undefined;
    if (typeof fieldErrors?.question === "string") {
      result.fieldErrors = { question: fieldErrors.question };
    }
    return result;
  }

  return failure("unavailable");
}

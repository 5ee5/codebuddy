import { failure } from "@/lib/assistant/errors";
import type { AssistantAnswer, DebugRequest } from "@/lib/assistant/types";
import { hasErrors, parseDebugRequest, validateDebug } from "@/lib/assistant/validation";
import { acquireSlot } from "@/lib/server/access";
import { createAnthropicClient } from "@/lib/server/anthropic";
import { answerDebug } from "@/lib/server/debug";
import {
  capReachedResponse,
  guardAssistantPost,
  jsonResult,
  logFailure,
} from "@/lib/server/route-guard";

/*
 * POST /api/debug: diagnoses a student's bug with the paid AI API.
 *
 * Same protections and order as /api/learn: same origin, body type and size,
 * server configuration, access code, request validation, then the usage cap
 * that Learn and Debug share. The submitted code and problem are never
 * logged; failures return fixed, friendly messages only.
 */

const ROUTE = "api/debug";

/*
 * 10,000 characters of code plus 4,000 of description, allowing for
 * multi-byte UTF-8 and JSON escaping. Field lengths are checked after parsing.
 */
const MAX_BODY_BYTES = 64 * 1024;

export async function POST(request: Request): Promise<Response> {
  const guard = await guardAssistantPost(request, {
    route: ROUTE,
    maxBytes: MAX_BODY_BYTES,
    tooLargeMessage: "That code is too long to send. Try a smaller piece.",
  });
  if (!guard.ok) return guard.response;

  const debugRequest = parseDebugRequest(guard.body);
  if (!debugRequest) return jsonResult(failure("invalid_request"), 400);
  const fieldErrors = validateDebug(debugRequest);
  if (hasErrors(fieldErrors)) {
    return jsonResult({ ...failure<DebugRequest>("invalid_request"), fieldErrors }, 400);
  }

  const release = acquireSlot();
  if (!release) return capReachedResponse();

  try {
    const outcome = await answerDebug(debugRequest, {
      client: createAnthropicClient(guard.config.apiKey),
      model: guard.config.model,
      signal: request.signal,
    });
    if (!outcome.ok) {
      logFailure(ROUTE, outcome.failure.code, outcome.status, outcome.requestId);
      return jsonResult(outcome.failure, outcome.status);
    }
    const answer: AssistantAnswer<DebugRequest> = {
      status: "answered",
      mode: "debug",
      response: outcome.response,
      model: outcome.model,
      createdAt: new Date().toISOString(),
    };
    return jsonResult(answer, 200);
  } finally {
    release();
  }
}

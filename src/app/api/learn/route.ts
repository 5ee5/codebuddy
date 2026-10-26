import type { AssistantAnswer, LearnRequest } from "@/lib/assistant/types";
import { failure } from "@/lib/assistant/errors";
import { hasErrors, parseLearnRequest, validateLearn } from "@/lib/assistant/validation";
import { acquireSlot } from "@/lib/server/usage-cap";
import { createAnthropicClient } from "@/lib/server/anthropic";
import { answerLearn } from "@/lib/server/learn";
import {
  capReachedResponse,
  guardAssistantPost,
  jsonResult,
  logFailure,
} from "@/lib/server/route-guard";

/*
 * POST /api/learn: answers a Learn question with the paid AI API.
 *
 * Every check that can reject a request runs before the provider is called,
 * in this order: same origin, body type and size, server configuration,
 * signed-in user (all in `guardAssistantPost`), then request validation and the
 * shared usage cap. Responses are always a JSON `AssistantResult` with a
 * fixed, friendly message on failure.
 */

const ROUTE = "api/learn";

/** Generous for a 2,000-character question, small enough to reject junk early. */
const MAX_BODY_BYTES = 16 * 1024;

export async function POST(request: Request): Promise<Response> {
  const guard = await guardAssistantPost(request, {
    route: ROUTE,
    maxBytes: MAX_BODY_BYTES,
    tooLargeMessage: "That question is too long to send.",
  });
  if (!guard.ok) return guard.response;

  const learnRequest = parseLearnRequest(guard.body);
  if (!learnRequest) return jsonResult(failure("invalid_request"), 400);
  const fieldErrors = validateLearn(learnRequest);
  if (hasErrors(fieldErrors)) {
    return jsonResult({ ...failure<LearnRequest>("invalid_request"), fieldErrors }, 400);
  }

  const release = acquireSlot();
  if (!release) return capReachedResponse();

  try {
    const outcome = await answerLearn(learnRequest, {
      client: createAnthropicClient(guard.config.apiKey),
      model: guard.config.model,
      signal: request.signal,
    });
    if (!outcome.ok) {
      logFailure(ROUTE, outcome.failure.code, outcome.status, outcome.requestId);
      return jsonResult(outcome.failure, outcome.status);
    }
    const answer: AssistantAnswer<LearnRequest> = {
      status: "answered",
      mode: "learn",
      response: outcome.response,
      model: outcome.model,
      createdAt: new Date().toISOString(),
    };
    return jsonResult(answer, 200);
  } finally {
    release();
  }
}

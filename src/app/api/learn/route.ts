import { failure } from "@/lib/assistant/errors";
import type { AssistantAnswer, AssistantResult, LearnRequest } from "@/lib/assistant/types";
import { hasErrors, parseLearnRequest, validateLearn } from "@/lib/assistant/validation";
import { acquireSlot, checkAccessCode } from "@/lib/server/access";
import { createAnthropicClient, getServerConfig } from "@/lib/server/anthropic";
import { answerLearn } from "@/lib/server/learn";

/*
 * POST /api/learn: the only route that calls the paid AI API.
 *
 * Every check that can reject a request runs before the provider is called,
 * in this order: same origin, body type and size, server configuration,
 * access code, request validation, usage cap. Responses are always a JSON
 * `AssistantResult` with a fixed, friendly message on failure.
 */

/** Generous for a 2,000-character question, small enough to reject junk early. */
const MAX_BODY_BYTES = 16 * 1024;

type Result = AssistantResult<LearnRequest>;

function json(body: Result, status: number): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function log(code: string, status: number, requestId?: string | null): void {
  // Only codes and IDs: never the question, the answer, the key or the access code.
  console.error("[api/learn]", code, status, requestId ?? "-");
}

/** Browsers send `Origin` on cross-site POSTs; reject any that is not this host. */
function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}

/** Reads the body as text, giving up as soon as it exceeds `MAX_BODY_BYTES`. */
async function readBody(request: Request): Promise<string | null> {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_BODY_BYTES) return null;
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) {
    return json(failure("access_denied", "Requests from other websites aren’t allowed."), 403);
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return json(failure("invalid_request"), 415);
  }
  const raw = await readBody(request);
  if (raw === null) {
    return json(failure("invalid_request", "That question is too long to send."), 413);
  }

  const config = getServerConfig();
  if (!config) {
    log("not_configured", 503);
    return json(failure("not_configured"), 503);
  }
  if (!checkAccessCode(request.headers.get("authorization"), config.accessCode)) {
    return json(failure("access_denied"), 401);
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json(failure("invalid_request"), 400);
  }
  const learnRequest = parseLearnRequest(body);
  if (!learnRequest) return json(failure("invalid_request"), 400);
  const fieldErrors = validateLearn(learnRequest);
  if (hasErrors(fieldErrors)) {
    return json({ ...failure<LearnRequest>("invalid_request"), fieldErrors }, 400);
  }

  const release = acquireSlot();
  if (!release) {
    return json(
      failure(
        "rate_limited",
        "CodeBuddy’s hourly question limit has been reached. Try again later.",
      ),
      429,
    );
  }

  try {
    const outcome = await answerLearn(learnRequest, {
      client: createAnthropicClient(config.apiKey),
      model: config.model,
      signal: request.signal,
    });
    if (!outcome.ok) {
      log(outcome.failure.code, outcome.status, outcome.requestId);
      return json(outcome.failure, outcome.status);
    }
    const answer: AssistantAnswer<LearnRequest> = {
      status: "answered",
      mode: "learn",
      response: outcome.response,
      model: outcome.model,
      createdAt: new Date().toISOString(),
    };
    return json(answer, 200);
  } finally {
    release();
  }
}

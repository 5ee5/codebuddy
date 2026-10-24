import Anthropic from "@anthropic-ai/sdk";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/learn/route";
import { HOURLY_REQUEST_LIMIT, resetUsageForTests } from "@/lib/server/access";
import { LEARN_MAX_TOKENS, LEARN_RESPONSE_SCHEMA } from "@/lib/server/learn";

/*
 * The Anthropic client is replaced with a fake, so these tests never need a
 * real API key and never spend credits.
 */
const { create, createAnthropicClient } = vi.hoisted(() => {
  const create = vi.fn();
  return { create, createAnthropicClient: vi.fn(() => ({ messages: { create } })) };
});
vi.mock("@/lib/server/anthropic", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/server/anthropic")>()),
  createAnthropicClient,
}));

const API_KEY = "sk-ant-test-key-never-real";
const ACCESS_CODE = "test-access-code-0123456789";
const MODEL = "claude-sonnet-5-5";
const PROVIDER_SECRET = "internal provider detail xyz";

const validAnswer = {
  explanation: "A loop repeats code.\n\nA for loop runs once per item.",
  example: { language: "python", code: "for n in [1, 2, 3]:\n    print(n)" },
  keyPoints: ["Loops repeat code."],
  followUpQuestions: ["When should I use a while loop?"],
};

function message(text: string, stop_reason: Anthropic.StopReason = "end_turn"): Anthropic.Message {
  return {
    id: "msg_test",
    type: "message",
    role: "assistant",
    model: MODEL,
    content: [{ type: "text", text, citations: null }],
    stop_reason,
    stop_sequence: null,
    usage: { input_tokens: 10, output_tokens: 20 },
  } as unknown as Anthropic.Message;
}

const validBody = { mode: "learn", question: "What is a for loop in Python?", level: "beginner" };

function post(
  body: unknown = validBody,
  {
    headers = {},
    code = ACCESS_CODE,
    raw,
  }: { headers?: Record<string, string>; code?: string | null; raw?: string } = {},
): Promise<Response> {
  return POST(
    new Request("http://localhost:3001/api/learn", {
      method: "POST",
      headers: {
        host: "localhost:3001",
        "content-type": "application/json",
        ...(code ? { authorization: `Bearer ${code}` } : {}),
        ...headers,
      },
      body: raw ?? JSON.stringify(body),
    }),
  );
}

let errorLog: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  resetUsageForTests();
  create.mockReset();
  createAnthropicClient.mockClear();
  vi.stubEnv("ANTHROPIC_API_KEY", API_KEY);
  vi.stubEnv("ANTHROPIC_MODEL", MODEL);
  vi.stubEnv("CODEBUDDY_ACCESS_CODE", ACCESS_CODE);
  errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  // Nothing sensitive may ever reach the server log.
  const logged = JSON.stringify(errorLog.mock.calls);
  expect(logged).not.toContain(API_KEY);
  expect(logged).not.toContain(ACCESS_CODE);
  expect(logged).not.toContain(PROVIDER_SECRET);
});

async function expectFailure(res: Response, status: number, code: string) {
  expect(res.status).toBe(status);
  expect(res.headers.get("cache-control")).toBe("no-store");
  const text = await res.text();
  expect(text).not.toContain(API_KEY);
  expect(text).not.toContain(ACCESS_CODE);
  expect(text).not.toContain(PROVIDER_SECRET);
  const body = JSON.parse(text);
  expect(body).toMatchObject({ status: "error", code });
  expect(typeof body.message).toBe("string");
  return body;
}

describe("POST /api/learn: rejected before any paid call", () => {
  afterEach(() => expect(create).not.toHaveBeenCalled());

  it.each(["ANTHROPIC_API_KEY", "ANTHROPIC_MODEL", "CODEBUDDY_ACCESS_CODE"])(
    "returns 503 when %s is missing",
    async (name) => {
      vi.stubEnv(name, "");
      await expectFailure(await post(), 503, "not_configured");
    },
  );

  it("returns 503 when the access code is too short to be safe", async () => {
    vi.stubEnv("CODEBUDDY_ACCESS_CODE", "short");
    await expectFailure(await post(validBody, { code: "short" }), 503, "not_configured");
  });

  it("returns 401 without an access code", async () => {
    await expectFailure(await post(validBody, { code: null }), 401, "access_denied");
  });

  it("returns 401 for a wrong access code", async () => {
    await expectFailure(await post(validBody, { code: "wrong-code-0123456789" }), 401, "access_denied");
  });

  it("returns 403 for a cross-site request", async () => {
    const res = await post(validBody, { headers: { origin: "https://evil.example" } });
    await expectFailure(res, 403, "access_denied");
  });

  it("accepts a same-origin Origin header", async () => {
    create.mockResolvedValueOnce(message(JSON.stringify(validAnswer)));
    const res = await post(validBody, { headers: { origin: "http://localhost:3001" } });
    expect(res.status).toBe(200);
    create.mockClear(); // this case is allowed to call the provider
  });

  it("returns 415 for a non-JSON content type", async () => {
    const res = await post(validBody, { headers: { "content-type": "text/plain" } });
    await expectFailure(res, 415, "invalid_request");
  });

  it("returns 413 for an oversized body", async () => {
    const res = await post(null, { raw: JSON.stringify({ ...validBody, question: "x".repeat(20_000) }) });
    await expectFailure(res, 413, "invalid_request");
  });

  it("returns 400 for malformed JSON", async () => {
    await expectFailure(await post(null, { raw: "{not json" }), 400, "invalid_request");
  });

  it("returns 400 for the wrong shape", async () => {
    await expectFailure(await post({ ...validBody, level: "expert" }), 400, "invalid_request");
  });

  it("returns 400 with field errors from the shared validator", async () => {
    const body = await expectFailure(await post({ ...validBody, question: "short" }), 400, "invalid_request");
    expect(body.fieldErrors.question).toMatch(/at least 10 characters/);
  });

  it("returns 429 once the hourly cap is used up", async () => {
    create.mockResolvedValue(message(JSON.stringify(validAnswer)));
    for (let i = 0; i < HOURLY_REQUEST_LIMIT; i++) {
      expect((await post()).status).toBe(200);
    }
    create.mockClear();
    await expectFailure(await post(), 429, "rate_limited");
  });
});

describe("POST /api/learn: model call", () => {
  it("returns a validated answer and sends the expected request", async () => {
    create.mockResolvedValueOnce(message(JSON.stringify(validAnswer)));
    const res = await post({ ...validBody, topic: "Loops" });

    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const body = await res.json();
    expect(body).toMatchObject({
      status: "answered",
      mode: "learn",
      model: MODEL,
      response: { mode: "learn", ...validAnswer },
    });
    expect(Date.parse(body.createdAt)).not.toBeNaN();

    expect(createAnthropicClient).toHaveBeenCalledWith(API_KEY);
    expect(create).toHaveBeenCalledTimes(1);
    const [params, options] = create.mock.calls[0];
    expect(params).toMatchObject({
      model: MODEL,
      max_tokens: LEARN_MAX_TOKENS,
      output_config: { effort: "low", format: { type: "json_schema", schema: LEARN_RESPONSE_SCHEMA } },
    });
    expect(LEARN_MAX_TOKENS).toBe(2000);
    for (const key of ["temperature", "top_p", "top_k", "thinking", "tools"]) {
      expect(params).not.toHaveProperty(key);
    }
    expect(params.messages).toHaveLength(1);
    expect(params.messages[0].content).toContain("What is a for loop in Python?");
    expect(params.messages[0].content).toContain("Loops");
    expect(options.signal).toBeInstanceOf(AbortSignal);
  });

  it.each([
    ["non-JSON text", message("Sure! Here is an explanation…")],
    ["JSON missing fields", message(JSON.stringify({ explanation: "Only this" }))],
    ["an unsupported example language", message(JSON.stringify({ ...validAnswer, example: { language: "rust", code: "x" } }))],
    ["oversized fields", message(JSON.stringify({ ...validAnswer, explanation: "x".repeat(10_000) }))],
    ["no text block", { ...message(""), content: [] } as unknown as Anthropic.Message],
    ["a max_tokens stop", message('{"explanation": "cut of', "max_tokens")],
  ])("returns 502 malformed_output for %s", async (_label, reply) => {
    create.mockResolvedValueOnce(reply);
    await expectFailure(await post(), 502, "malformed_output");
  });

  it("returns 422 refused when the model refuses", async () => {
    create.mockResolvedValueOnce(message("", "refusal"));
    await expectFailure(await post(), 422, "refused");
  });

  const headers = new Headers({ "request-id": "req_test_123" });
  const apiBody = { type: "error", error: { type: "x", message: PROVIDER_SECRET } };
  it.each([
    ["RateLimitError", new Anthropic.RateLimitError(429, apiBody, PROVIDER_SECRET, headers), 429, "rate_limited"],
    ["AuthenticationError", new Anthropic.AuthenticationError(401, apiBody, PROVIDER_SECRET, headers), 503, "not_configured"],
    ["PermissionDeniedError", new Anthropic.PermissionDeniedError(403, apiBody, PROVIDER_SECRET, headers), 503, "not_configured"],
    ["NotFoundError (bad model)", new Anthropic.NotFoundError(404, apiBody, PROVIDER_SECRET, headers), 503, "not_configured"],
    ["BadRequestError", new Anthropic.BadRequestError(400, apiBody, PROVIDER_SECRET, headers), 502, "unavailable"],
    ["InternalServerError", new Anthropic.InternalServerError(500, apiBody, PROVIDER_SECRET, headers), 503, "unavailable"],
    ["overloaded (529)", new Anthropic.InternalServerError(529, apiBody, PROVIDER_SECRET, headers), 503, "unavailable"],
    ["APIConnectionTimeoutError", new Anthropic.APIConnectionTimeoutError({ message: PROVIDER_SECRET }), 504, "timeout"],
    ["APIConnectionError", new Anthropic.APIConnectionError({ message: PROVIDER_SECRET }), 503, "unavailable"],
    ["an unexpected Error", new Error(PROVIDER_SECRET), 500, "unavailable"],
  ])("maps %s to a safe %i response", async (_label, error, status, code) => {
    create.mockRejectedValueOnce(error);
    await expectFailure(await post(), status, code);
    expect(create).toHaveBeenCalledTimes(1); // no automatic retry
    expect(errorLog).toHaveBeenCalledWith("[api/learn]", code, status, expect.any(String));
  });

  it("logs the provider request ID but nothing else", async () => {
    create.mockRejectedValueOnce(
      new Anthropic.RateLimitError(429, {}, PROVIDER_SECRET, new Headers({ "request-id": "req_abc" })),
    );
    await post();
    expect(errorLog).toHaveBeenCalledWith("[api/learn]", "rate_limited", 429, "req_abc");
  });

  it("releases the concurrency slot after a failure", async () => {
    create.mockRejectedValue(new Error("boom"));
    for (let i = 0; i < 5; i++) expect((await post()).status).toBe(500);
  });
});

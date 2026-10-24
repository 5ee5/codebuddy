import { describe, expect, it, vi } from "vitest";
import { askLearn, previewRequest } from "@/lib/assistant/client";
import type { LearnRequest } from "@/lib/assistant/types";

const request: LearnRequest = { mode: "learn", question: "What is a variable?", level: "beginner" };
const CODE = "test-access-code-0123456789";

function mockFetch(impl: (url: string, init: RequestInit) => Promise<Response>) {
  const fetchMock = vi.fn(impl);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("askLearn", () => {
  it("posts JSON with the code in the Authorization header only", async () => {
    const answer = {
      status: "answered",
      mode: "learn",
      model: "claude-sonnet-5-5",
      createdAt: "2026-10-24T12:00:00.000Z",
      response: {
        mode: "learn",
        explanation: "A variable stores a value.",
        keyPoints: ["Names point at values."],
        followUpQuestions: [],
      },
    };
    const fetchMock = mockFetch(async () => Response.json(answer));

    const result = await askLearn(request, CODE);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/learn");
    expect(url).not.toContain(CODE);
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({ Authorization: `Bearer ${CODE}` });
    expect(JSON.parse(init.body as string)).toEqual(request);
    expect(result).toEqual(answer);
  });

  it("passes through a server failure with its field errors", async () => {
    mockFetch(async () =>
      Response.json(
        { status: "error", code: "invalid_request", message: "Fix it", fieldErrors: { question: "Too short" } },
        { status: 400 },
      ),
    );
    expect(await askLearn(request, CODE)).toEqual({
      status: "error",
      code: "invalid_request",
      message: "Fix it",
      fieldErrors: { question: "Too short" },
    });
  });

  it("turns a network error into a typed failure", async () => {
    mockFetch(async () => {
      throw new TypeError("Failed to fetch");
    });
    expect(await askLearn(request, CODE)).toMatchObject({ status: "error", code: "network" });
  });

  it("turns a non-JSON reply into a typed failure", async () => {
    mockFetch(async () => new Response("<html>Bad gateway</html>", { status: 502 }));
    expect(await askLearn(request, CODE)).toMatchObject({ status: "error", code: "unavailable" });
  });

  it("rejects an answer that does not match the contract", async () => {
    mockFetch(async () =>
      Response.json({ status: "answered", model: "m", createdAt: "t", response: { explanation: 1 } }),
    );
    expect(await askLearn(request, CODE)).toMatchObject({ status: "error", code: "malformed_output" });
  });

  it("rejects unknown error codes", async () => {
    mockFetch(async () => Response.json({ status: "error", code: "stack_trace", message: "at foo.js:1" }));
    expect(await askLearn(request, CODE)).toMatchObject({ status: "error", code: "unavailable" });
  });

  it("returns a failure instead of throwing when aborted", async () => {
    mockFetch((_url, init) => {
      return new Promise((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
      });
    });
    const controller = new AbortController();
    const pending = askLearn(request, CODE, controller.signal);
    controller.abort();
    expect(await pending).toMatchObject({ status: "error" });
  });
});

describe("previewRequest", () => {
  it("stays local and points at the per-mode endpoint", async () => {
    const fetchMock = mockFetch(async () => new Response());
    const preview = await previewRequest({
      mode: "debug",
      language: "python",
      code: "print(x)",
      errorMessage: "",
    });
    expect(preview).toMatchObject({ status: "not-connected", plannedEndpoint: "/api/debug" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

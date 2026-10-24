import { describe, expect, it, vi } from "vitest";

const { Anthropic } = vi.hoisted(() => ({ Anthropic: vi.fn() }));
vi.mock("@anthropic-ai/sdk", () => ({ default: Anthropic }));

import {
  ANTHROPIC_TIMEOUT_MS,
  createAnthropicClient,
  getServerConfig,
} from "@/lib/server/anthropic";

describe("createAnthropicClient", () => {
  it("disables automatic retries and sets a timeout", () => {
    createAnthropicClient("sk-ant-test");
    expect(Anthropic).toHaveBeenCalledWith({ apiKey: "sk-ant-test", timeout: 45_000, maxRetries: 0 });
    expect(ANTHROPIC_TIMEOUT_MS).toBe(45_000);
  });
});

describe("getServerConfig", () => {
  it("returns trimmed settings when all are present", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", " key ");
    vi.stubEnv("ANTHROPIC_MODEL", "claude-sonnet-5-5");
    vi.stubEnv("CODEBUDDY_ACCESS_CODE", "0123456789abcdef");
    expect(getServerConfig()).toEqual({
      apiKey: "key",
      model: "claude-sonnet-5-5",
      accessCode: "0123456789abcdef",
    });
  });

  it("fails closed when the access code is shorter than 16 characters", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "key");
    vi.stubEnv("ANTHROPIC_MODEL", "claude-sonnet-5-5");
    vi.stubEnv("CODEBUDDY_ACCESS_CODE", "0123456789abcde");
    expect(getServerConfig()).toBeNull();
  });
});

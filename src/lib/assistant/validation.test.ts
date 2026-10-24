import { describe, expect, it } from "vitest";
import {
  LEARN_OUTPUT_LIMITS,
  LIMITS,
  parseLearnRequest,
  parseLearnResponse,
  validateLearn,
} from "@/lib/assistant/validation";

const validAnswer = {
  explanation: "A variable is a named box that stores a value.\n\nYou can change what is inside.",
  example: { language: "python", code: "age = 12\nprint(age)" },
  keyPoints: ["A variable has a name and a value."],
  followUpQuestions: ["What types of values can a variable hold?"],
};

describe("parseLearnRequest", () => {
  it("accepts a well-formed request and drops unknown keys", () => {
    const parsed = parseLearnRequest({
      mode: "learn",
      question: "  What is a variable?  ",
      level: "basics",
      topic: "Variables",
      apiKey: "should-be-dropped",
    });
    expect(parsed).toEqual({
      mode: "learn",
      question: "What is a variable?",
      level: "basics",
      topic: "Variables",
    });
  });

  it("allows the topic to be absent", () => {
    expect(parseLearnRequest({ mode: "learn", question: "Explain loops please", level: "beginner" }))
      .toEqual({ mode: "learn", question: "Explain loops please", level: "beginner" });
  });

  it.each([
    ["not an object", "hello"],
    ["null", null],
    ["an array", []],
    ["the wrong mode", { mode: "debug", question: "x".repeat(20), level: "beginner" }],
    ["a non-string question", { mode: "learn", question: 42, level: "beginner" }],
    ["an unknown level", { mode: "learn", question: "x".repeat(20), level: "expert" }],
    ["a non-string topic", { mode: "learn", question: "x".repeat(20), level: "beginner", topic: 1 }],
    [
      "an oversized topic",
      { mode: "learn", question: "x".repeat(20), level: "beginner", topic: "t".repeat(LIMITS.topicMax + 1) },
    ],
  ])("rejects %s", (_label, body) => {
    expect(parseLearnRequest(body)).toBeNull();
  });

  it("leaves length rules to validateLearn", () => {
    const parsed = parseLearnRequest({ mode: "learn", question: "short", level: "beginner" });
    expect(parsed).not.toBeNull();
    expect(validateLearn(parsed!).question).toMatch(/at least/);
  });
});

describe("parseLearnResponse", () => {
  it("accepts a contract-shaped answer and adds the mode", () => {
    expect(parseLearnResponse(validAnswer)).toEqual({ mode: "learn", ...validAnswer });
  });

  it("turns example: null into an absent example", () => {
    const parsed = parseLearnResponse({ ...validAnswer, example: null });
    expect(parsed).not.toBeNull();
    expect(parsed).not.toHaveProperty("example");
  });

  it("drops unexpected keys", () => {
    const parsed = parseLearnResponse({ ...validAnswer, html: "<script>alert(1)</script>" });
    expect(parsed).not.toHaveProperty("html");
  });

  const L = LEARN_OUTPUT_LIMITS;
  it.each([
    ["a missing explanation", { ...validAnswer, explanation: undefined }],
    ["an empty explanation", { ...validAnswer, explanation: "   " }],
    ["an oversized explanation", { ...validAnswer, explanation: "x".repeat(L.explanationMax + 1) }],
    ["no key points", { ...validAnswer, keyPoints: [] }],
    ["too many key points", { ...validAnswer, keyPoints: Array(L.keyPointsMax + 1).fill("point") }],
    ["a non-string key point", { ...validAnswer, keyPoints: [1] }],
    ["an oversized key point", { ...validAnswer, keyPoints: ["x".repeat(L.itemMax + 1)] }],
    ["too many follow-ups", { ...validAnswer, followUpQuestions: Array(L.followUpMax + 1).fill("q?") }],
    ["follow-ups that are not a list", { ...validAnswer, followUpQuestions: "q?" }],
    ["an unknown example language", { ...validAnswer, example: { language: "rust", code: "fn main() {}" } }],
    ["empty example code", { ...validAnswer, example: { language: "python", code: "" } }],
    [
      "oversized example code",
      { ...validAnswer, example: { language: "python", code: "x".repeat(L.exampleCodeMax + 1) } },
    ],
    ["a non-object example", { ...validAnswer, example: "print(1)" }],
    ["a non-object answer", "just text"],
  ])("rejects %s", (_label, value) => {
    expect(parseLearnResponse(value)).toBeNull();
  });
});

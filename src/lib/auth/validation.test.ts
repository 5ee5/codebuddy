import { describe, expect, it } from "vitest";
import {
  hasFieldErrors,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  validateNewPassword,
  validateSignIn,
} from "@/lib/auth/validation";

describe("validateSignIn", () => {
  it("accepts an email and a password", () => {
    expect(hasFieldErrors(validateSignIn("ada@example.com", "anything"))).toBe(false);
  });

  it("asks for both fields", () => {
    expect(validateSignIn("", "")).toEqual({
      email: "Enter your email address.",
      password: "Enter your password.",
    });
  });

  it.each(["ada", "ada@", "a da@example.com", `${"a".repeat(250)}@example.com`])("rejects the email %s", (email) => {
    expect(validateSignIn(email, "x").email).toMatch(/valid email/);
  });
});

describe("validateNewPassword", () => {
  const good = "a".repeat(PASSWORD_MIN_LENGTH);

  it("accepts a long enough password typed twice", () => {
    expect(hasFieldErrors(validateNewPassword(good, good))).toBe(false);
  });

  it("rejects a short password", () => {
    expect(validateNewPassword("short", "short").password).toMatch(/at least 8/);
  });

  it("counts bytes, not characters, for the upper limit", () => {
    const emoji = "😀".repeat(PASSWORD_MAX_LENGTH / 4 + 1);
    expect(validateNewPassword(emoji, emoji).password).toMatch(/at most 72/);
  });

  it("asks for the same password twice", () => {
    expect(validateNewPassword(good, `${good}x`)).toEqual({ confirm: "The two passwords don’t match." });
  });
});

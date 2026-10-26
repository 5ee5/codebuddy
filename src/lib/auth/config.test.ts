import { describe, expect, it, vi } from "vitest";
import { getSupabaseSecretKey } from "@/lib/auth/config";

describe("getSupabaseSecretKey", () => {
  it("returns the trimmed secret key", () => {
    vi.stubEnv("SUPABASE_SECRET_KEY", " sb_secret_abc ");
    expect(getSupabaseSecretKey()).toBe("sb_secret_abc");
  });

  it("treats a missing key as not set up", () => {
    vi.stubEnv("SUPABASE_SECRET_KEY", "");
    expect(getSupabaseSecretKey()).toBeNull();
  });

  it("refuses the publishable key pasted in by mistake", () => {
    vi.stubEnv("SUPABASE_SECRET_KEY", "sb_publishable_abc");
    expect(getSupabaseSecretKey()).toBeNull();
  });
});

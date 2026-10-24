import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

/*
 * Temporary safeguards for paid API use while CodeBuddy runs on a LAN dev
 * server: a shared access code and a small in-memory usage cap. This is not
 * authentication; it only stops casual or accidental use of the API credits.
 */

export const HOURLY_REQUEST_LIMIT = 30;
export const CONCURRENT_REQUEST_LIMIT = 2;
const WINDOW_MS = 60 * 60 * 1000;

function digest(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

/**
 * Compares the `Authorization: Bearer <code>` header with the expected code.
 * Hashing both sides first gives equal-length buffers, so the comparison is
 * constant-time regardless of the submitted length.
 */
export function checkAccessCode(authorization: string | null, expected: string): boolean {
  const match = authorization?.match(/^Bearer (.+)$/);
  if (!match) return false;
  return timingSafeEqual(digest(match[1].trim()), digest(expected));
}

// One fixed window per server process; it resets when the server restarts.
let windowStart = 0;
let windowCount = 0;
let inFlight = 0;

/**
 * Reserves room for one provider call. Returns a release function, or `null`
 * when the hourly cap or the concurrency limit is reached.
 */
export function acquireSlot(now: number = Date.now()): (() => void) | null {
  if (now - windowStart >= WINDOW_MS) {
    windowStart = now;
    windowCount = 0;
  }
  if (windowCount >= HOURLY_REQUEST_LIMIT || inFlight >= CONCURRENT_REQUEST_LIMIT) {
    return null;
  }
  windowCount += 1;
  inFlight += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    inFlight -= 1;
  };
}

export function resetUsageForTests(): void {
  windowStart = 0;
  windowCount = 0;
  inFlight = 0;
}

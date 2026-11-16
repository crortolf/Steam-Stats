import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { timeAgo } from "@/lib/time";

const NOW = new Date("2026-06-15T12:00:00Z");
const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

//timeAgo uses the machine's locale, so compare with the same formatter
//rather than hard-coding English; these tests check which unit and amount it picks
const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
const isoAgo = (ms: number) => new Date(NOW.getTime() - ms).toISOString();

describe("timeAgo", () => {
  //a fixed clock so "now" doesn't move while the tests run
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("says just now for under a minute", () => {
    expect(timeAgo(isoAgo(30 * SECOND))).toBe("just now");
  });

  it.each([
    [5 * MINUTE, -5, "minute"],
    [3 * HOUR, -3, "hour"],
    [DAY, -1, "day"],
    [2 * 7 * DAY, -2, "week"],
    [3 * 30 * DAY, -3, "month"],
    [2 * 365 * DAY, -2, "year"],
  ] as const)("picks the largest whole unit (%i ms ago)", (ms, amount, unit) => {
    expect(timeAgo(isoAgo(ms))).toBe(rtf.format(amount, unit));
  });

  it("rounds to the nearest unit", () => {
    expect(timeAgo(isoAgo(100 * MINUTE))).toBe(rtf.format(-2, "hour"));
    expect(timeAgo(isoAgo(80 * MINUTE))).toBe(rtf.format(-1, "hour"));
  });

  it("handles dates in the future", () => {
    expect(timeAgo(isoAgo(-2 * HOUR))).toBe(rtf.format(2, "hour"));
  });
});

import {
  parseTimeToMinutes,
  formatDateInZone,
  getPreviousDateInZone,
  minutesNowInZone,
  localDateTime,
  localMinuteStampInZone,
} from "./time";

describe("parseTimeToMinutes", () => {
  it("converts \"09:00\" to 540", () => {
    expect(parseTimeToMinutes("09:00")).toBe(540);
  });

  it("converts \"00:00\" to 0", () => {
    expect(parseTimeToMinutes("00:00")).toBe(0);
  });

  it("converts \"23:59\" to 1439", () => {
    expect(parseTimeToMinutes("23:59")).toBe(1439);
  });

  it("throws on invalid hour \"25:00\"", () => {
    expect(() => parseTimeToMinutes("25:00")).toThrow("Invalid time value: 25:00");
  });

  it("throws on invalid minute \"09:60\"", () => {
    expect(() => parseTimeToMinutes("09:60")).toThrow("Invalid time value: 09:60");
  });

  it("throws on non-time string \"abc\"", () => {
    expect(() => parseTimeToMinutes("abc")).toThrow("Invalid time value: abc");
  });
});

describe("formatDateInZone", () => {
  it("formats UTC date as Dubai local date", () => {
    // UTC midnight = Dubai 04:00 on the same day
    const date = new Date("2026-04-13T00:00:00.000Z");
    expect(formatDateInZone(date, "Asia/Dubai")).toBe("2026-04-13");
  });

  it("crosses midnight correctly — UTC 21:00 = Dubai next day 01:00", () => {
    // Dubai is UTC+4. UTC 21:00 = Dubai 01:00 next calendar day
    const date = new Date("2026-04-12T21:00:00.000Z");
    expect(formatDateInZone(date, "Asia/Dubai")).toBe("2026-04-13");
  });
});

describe("getPreviousDateInZone", () => {
  it("returns the previous calendar day in the given timezone", () => {
    const date = new Date("2026-04-13T06:00:00.000Z"); // Dubai 10:00 on Apr 13
    expect(getPreviousDateInZone(date, "Asia/Dubai")).toBe("2026-04-12");
  });
});

it.todo("handles DST spring-forward — day is 23 hours, naive -86400000ms subtraction gives wrong date");

describe("minutesNowInZone", () => {
  it("returns minutes since midnight in Dubai for 09:30 local", () => {
    // Dubai is UTC+4, so UTC 05:30 = Dubai 09:30
    const date = new Date("2026-04-13T05:30:00.000Z");
    expect(minutesNowInZone(date, "Asia/Dubai")).toBe(9 * 60 + 30); // 570
  });
});

describe("localDateTime", () => {
  it("combines date and time strings", () => {
    expect(localDateTime("2026-04-13", "09:00")).toBe("2026-04-13T09:00");
  });
});

describe("localMinuteStampInZone", () => {
  it("returns absolute UTC minutes representing the local wall-clock moment", () => {
    // Dubai 09:00 on 2026-04-13
    const date = new Date("2026-04-13T05:00:00.000Z"); // UTC 05:00 = Dubai 09:00
    const stamp = localMinuteStampInZone(date, "Asia/Dubai");
    // Should equal Date.UTC(2026, 3, 13, 9, 0) / 60000
    expect(stamp).toBe(Date.UTC(2026, 3, 13, 9, 0) / 60000);
  });
});

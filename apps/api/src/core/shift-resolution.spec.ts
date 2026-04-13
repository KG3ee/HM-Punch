import { resolveActiveShiftSegment } from "./shift-resolution";
import { ShiftPresetInput } from "./types";

const TZ = "Asia/Dubai";

function makePreset(overrides: Partial<ShiftPresetInput["segments"][0]> = {}): ShiftPresetInput {
  return {
    id: "preset-1",
    name: "Test Preset",
    segments: [{
      id: "seg-1",
      segmentNo: 1,
      startTime: "09:00",
      endTime: "17:00",
      crossesMidnight: false,
      lateGraceMinutes: 5,
      ...overrides,
    }],
  };
}

describe("resolveActiveShiftSegment", () => {
  it("returns segment when current time is within a normal (non-midnight) shift", () => {
    // Dubai 10:00 = UTC 06:00
    const now = new Date("2026-04-13T06:00:00.000Z");
    const result = resolveActiveShiftSegment(makePreset(), now, TZ);

    expect(result).not.toBeNull();
    expect(result!.segmentId).toBe("seg-1");
    expect(result!.shiftDate).toBe("2026-04-13");
    expect(result!.scheduleStartLocal).toBe("2026-04-13T09:00");
    expect(result!.scheduleEndLocal).toBe("2026-04-13T17:00");
  });

  it("returns null when current time is outside the shift window", () => {
    // Dubai 08:00 = UTC 04:00 — before 09:00 start
    const now = new Date("2026-04-13T04:00:00.000Z");
    const result = resolveActiveShiftSegment(makePreset(), now, TZ);
    expect(result).toBeNull();
  });

  it("handles cross-midnight shift — active in the late portion (before midnight)", () => {
    // Night shift 22:00–06:00, Dubai 23:00 = UTC 19:00
    const preset = makePreset({ startTime: "22:00", endTime: "06:00", crossesMidnight: true });
    const now = new Date("2026-04-13T19:00:00.000Z"); // Dubai 23:00 Apr 13
    const result = resolveActiveShiftSegment(preset, now, TZ);

    expect(result).not.toBeNull();
    expect(result!.shiftDate).toBe("2026-04-13");
  });

  it("handles cross-midnight shift — active in the early portion (after midnight)", () => {
    // Dubai 02:00 on Apr 14 = UTC 22:00 Apr 13
    const preset = makePreset({ startTime: "22:00", endTime: "06:00", crossesMidnight: true });
    const now = new Date("2026-04-13T22:00:00.000Z"); // Dubai 02:00 Apr 14
    const result = resolveActiveShiftSegment(preset, now, TZ);

    expect(result).not.toBeNull();
    // Anchored to yesterday (Apr 13) — the shift started on Apr 13
    expect(result!.shiftDate).toBe("2026-04-13");
  });

  it("isLateAt returns true when punching after start + grace period", () => {
    // Shift 09:00–17:00, grace 5 min. Punch at Dubai 09:10 = UTC 05:10 → late
    const now = new Date("2026-04-13T06:00:00.000Z"); // Dubai 10:00 — inside shift
    const result = resolveActiveShiftSegment(makePreset(), now, TZ);

    const punchAt = new Date("2026-04-13T05:10:00.000Z"); // Dubai 09:10
    expect(result!.isLateAt(punchAt, TZ)).toBe(true);
  });

  it("isLateAt returns false when punching within grace period", () => {
    // Punch at Dubai 09:03 = UTC 05:03 → within 5 min grace → NOT late
    const now = new Date("2026-04-13T06:00:00.000Z");
    const result = resolveActiveShiftSegment(makePreset(), now, TZ);

    const punchAt = new Date("2026-04-13T05:03:00.000Z"); // Dubai 09:03
    expect(result!.isLateAt(punchAt, TZ)).toBe(false);
  });
});

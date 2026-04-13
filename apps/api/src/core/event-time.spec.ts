import { resolveEventTime } from "./event-time";

const SERVER_NOW = new Date("2026-04-13T10:00:00.000Z");

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(SERVER_NOW);
});

afterEach(() => {
  jest.useRealTimers();
});

describe("resolveEventTime", () => {
  it("uses server time when no clientTimestamp provided", () => {
    const result = resolveEventTime();
    expect(result.source).toBe("SERVER");
    expect(result.trustLevel).toBe("HIGH");
    expect(result.effectiveAt).toEqual(SERVER_NOW);
    expect(result.anomaly).toBeNull();
    expect(result.skewMinutes).toBeNull();
  });

  it("uses server time and flags anomaly when clientTimestamp is invalid", () => {
    const result = resolveEventTime("not-a-date");
    expect(result.source).toBe("SERVER");
    expect(result.trustLevel).toBe("LOW");
    expect(result.anomaly).toBe("INVALID_CLIENT_TIMESTAMP");
  });

  it("uses server time when client is too far in the future (> maxFutureMinutes)", () => {
    const future = new Date(SERVER_NOW.getTime() + 3 * 60 * 1000).toISOString();
    const result = resolveEventTime(future);
    expect(result.source).toBe("SERVER");
    expect(result.anomaly).toBe("CLIENT_TIME_TOO_FAR_IN_FUTURE");
    expect(result.effectiveAt).toEqual(SERVER_NOW);
  });

  it("uses CLIENT time (but flags anomaly) when client timestamp is too old", () => {
    const tooOld = new Date(SERVER_NOW.getTime() - 73 * 60 * 60 * 1000).toISOString();
    const result = resolveEventTime(tooOld);
    expect(result.source).toBe("CLIENT");
    expect(result.anomaly).toBe("CLIENT_TIME_TOO_OLD");
    expect(result.trustLevel).toBe("LOW");
    expect(result.effectiveAt.toISOString()).toBe(tooOld);
  });

  it("HIGH trust when client skew is within highTrustSkewMinutes (default 2)", () => {
    const oneMinuteAgo = new Date(SERVER_NOW.getTime() - 1 * 60 * 1000).toISOString();
    const result = resolveEventTime(oneMinuteAgo);
    expect(result.trustLevel).toBe("HIGH");
    expect(result.source).toBe("CLIENT");
    expect(result.anomaly).toBeNull();
    expect(result.skewMinutes).toBe(1);
  });

  it("MEDIUM trust when client skew exceeds highTrustSkewMinutes", () => {
    const thirtyMinutesAgo = new Date(SERVER_NOW.getTime() - 30 * 60 * 1000).toISOString();
    const result = resolveEventTime(thirtyMinutesAgo);
    expect(result.trustLevel).toBe("MEDIUM");
    expect(result.skewMinutes).toBe(30);
    expect(result.anomaly).toBeNull();
  });

  it("respects custom options — tighter maxFutureMinutes", () => {
    const thirtySecondsAhead = new Date(SERVER_NOW.getTime() + 30 * 1000).toISOString();
    const defaultResult = resolveEventTime(thirtySecondsAhead);
    expect(defaultResult.source).toBe("CLIENT");

    const strictResult = resolveEventTime(thirtySecondsAhead, { maxFutureMinutes: 0 });
    expect(strictResult.anomaly).toBe("CLIENT_TIME_TOO_FAR_IN_FUTURE");
  });
});

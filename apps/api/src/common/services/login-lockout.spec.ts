type LockoutModule = typeof import("./login-lockout");

let recordFailedLogin: LockoutModule["recordFailedLogin"];
let getLockoutInfo: LockoutModule["getLockoutInfo"];
let resetLoginFailures: LockoutModule["resetLoginFailures"];

beforeEach(() => {
  jest.resetModules();
  delete process.env.AUTH_LOCKOUT_MAX_ATTEMPTS;
  delete process.env.AUTH_LOCKOUT_COOLDOWN_MS;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require("./login-lockout") as LockoutModule;
  recordFailedLogin = mod.recordFailedLogin;
  getLockoutInfo = mod.getLockoutInfo;
  resetLoginFailures = mod.resetLoginFailures;
});

describe("recordFailedLogin", () => {
  it("returns false for first failure (below default threshold of 5)", () => {
    expect(recordFailedLogin("alice")).toBe(false);
  });

  it("returns true and locks after reaching max attempts (default 5)", () => {
    recordFailedLogin("bob");
    recordFailedLogin("bob");
    recordFailedLogin("bob");
    recordFailedLogin("bob");
    const locked = recordFailedLogin("bob"); // 5th attempt
    expect(locked).toBe(true);
    expect(getLockoutInfo("bob")).toMatchObject({ locked: true });
  });

  it("extends lockout on further attempts while already locked", () => {
    process.env.AUTH_LOCKOUT_MAX_ATTEMPTS = "2";
    process.env.AUTH_LOCKOUT_COOLDOWN_MS = "60000";
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("./login-lockout") as LockoutModule;

    mod.recordFailedLogin("carol");
    mod.recordFailedLogin("carol"); // now locked

    const infoBefore = mod.getLockoutInfo("carol")!;
    expect(infoBefore.locked).toBe(true);

    // Wait a tick then hit again to get a later timestamp
    jest.spyOn(Date, "now").mockReturnValue(Date.now() + 5000);
    mod.recordFailedLogin("carol");
    jest.restoreAllMocks();

    const infoAfter = mod.getLockoutInfo("carol")!;
    expect(infoAfter.retryAfterMs).toBeGreaterThan(infoBefore.retryAfterMs);
  });

  it("normalises username to lowercase and trims whitespace", () => {
    // All these should resolve to the same key "dave"
    recordFailedLogin("  Dave  ");
    recordFailedLogin("DAVE");
    recordFailedLogin("dave");
    recordFailedLogin("Dave");
    const locked = recordFailedLogin("  dave  "); // 5th attempt
    expect(locked).toBe(true);
  });
});

describe("resetLoginFailures", () => {
  it("clears the counter so previous attempts no longer count", () => {
    recordFailedLogin("eve");
    recordFailedLogin("eve");
    resetLoginFailures("eve");

    expect(getLockoutInfo("eve")).toBeNull();
    // 4 more attempts should NOT lock (counter was reset, default max = 5)
    recordFailedLogin("eve");
    recordFailedLogin("eve");
    recordFailedLogin("eve");
    recordFailedLogin("eve");
    expect(getLockoutInfo("eve")).toBeNull();
  });
});

describe("getLockoutInfo", () => {
  it("returns null when user has no entry", () => {
    expect(getLockoutInfo("unknown")).toBeNull();
  });

  it("returns null and cleans up when lockout has expired", async () => {
    process.env.AUTH_LOCKOUT_MAX_ATTEMPTS = "1";
    process.env.AUTH_LOCKOUT_COOLDOWN_MS = "10"; // 10ms — expires almost immediately
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("./login-lockout") as LockoutModule;

    mod.recordFailedLogin("frank"); // locked immediately (maxAttempts=1)

    await new Promise<void>((resolve) => setTimeout(resolve, 50)); // wait for expiry

    expect(mod.getLockoutInfo("frank")).toBeNull();
  });
});

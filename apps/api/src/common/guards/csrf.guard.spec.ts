import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { CsrfGuard } from "./csrf.guard";

function makeContext(request: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

describe("CsrfGuard", () => {
  let guard: CsrfGuard;

  beforeEach(() => {
    guard = new CsrfGuard();
  });

  it("passes GET requests without CSRF check", async () => {
    const ctx = makeContext({ method: "GET", headers: {}, cookies: {} });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it("passes HEAD requests without CSRF check", async () => {
    const ctx = makeContext({ method: "HEAD", headers: {}, cookies: {} });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it("passes requests using Bearer authorization (exempt from CSRF)", async () => {
    const ctx = makeContext({
      method: "POST",
      headers: { authorization: "Bearer eyJhbGc..." },
      cookies: {},
    });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it("passes when csrf_token cookie matches X-CSRF-Token header", async () => {
    const ctx = makeContext({
      method: "POST",
      headers: { "x-csrf-token": "abc123" },
      cookies: { csrf_token: "abc123" },
    });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it("throws ForbiddenException when header and cookie do not match", async () => {
    const ctx = makeContext({
      method: "POST",
      headers: { "x-csrf-token": "wrong-token" },
      cookies: { csrf_token: "abc123" },
    });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it("throws ForbiddenException when X-CSRF-Token header is missing", async () => {
    const ctx = makeContext({
      method: "POST",
      headers: {},
      cookies: { csrf_token: "abc123" },
    });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it("throws ForbiddenException when csrf_token cookie is missing", async () => {
    const ctx = makeContext({
      method: "POST",
      headers: { "x-csrf-token": "abc123" },
      cookies: {},
    });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });
});

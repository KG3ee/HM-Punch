// Cookie-first auth: keep these helpers as no-op/empty for compatibility.
export function setAccessToken(_token: string): void {}

export function getAccessToken(): string {
  return '';
}

export function clearAuth(): void {}

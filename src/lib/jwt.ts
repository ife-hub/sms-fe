/** Decode the `exp` claim (seconds) of a JWT without verifying it. Client-side expiry hint only. */
export function getTokenExpiry(token: string): number | null {
  try {
    const payload = token.split(".")[1];
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof json.exp === "number" ? json.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function isTokenExpiring(token: string, skewMs = 10_000): boolean {
  const exp = getTokenExpiry(token);
  if (exp === null) return false;
  return exp - skewMs <= Date.now();
}

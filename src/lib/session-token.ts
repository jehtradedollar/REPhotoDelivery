import { jwtVerify, SignJWT } from "jose";

// Signed session cookie. Kept free of server-only imports so middleware can use it.
export const SESSION_COOKIE = "rpd_session";
export const SESSION_DAYS = 30;

function key() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) {
    if (process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET must be set to at least 32 characters.");
    return new TextEncoder().encode("dev-only-insecure-secret-dev-only-insecure");
  }
  return new TextEncoder().encode(s);
}

export async function signSession(payload: { sub: string; v: number }) {
  return new SignJWT({ v: payload.v })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(key());
}

export async function verifySession(token: string | undefined) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    return payload.sub ? { sub: payload.sub, v: Number(payload.v ?? 1) } : null;
  } catch {
    return null;
  }
}

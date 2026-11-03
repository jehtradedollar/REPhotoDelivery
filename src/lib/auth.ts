import "server-only";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db, schema as s } from "@/db";
import { newId } from "./ids";
import { SESSION_COOKIE, SESSION_DAYS, signSession, verifySession } from "./session-token";
import type { Session, User } from "./types";

export { SESSION_COOKIE };

/* ---------- Passwords ---------- */

export const MIN_PASSWORD = 8;
export const hashPassword = (pw: string) => bcrypt.hash(pw, 12);
export const verifyPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);

/* ---------- Sessions ---------- */

export async function startSession(user: Pick<User, "id" | "sessionVersion">) {
  const token = await signSession({ sub: user.id, v: user.sessionVersion });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * SESSION_DAYS,
  });
  await db.update(s.users).set({ lastLoginAt: sql`now()` }).where(eq(s.users.id, user.id));
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** The signed-in user, loaded once per request. */
export const getSession = cache(async (): Promise<Session | null> => {
  const claims = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!claims) return null;
  const user = (await db.select().from(s.users).where(eq(s.users.id, claims.sub)))[0];
  if (!user || user.sessionVersion !== claims.v) return null;
  if (user.role === "client") {
    const client = user.clientId ? (await db.select().from(s.clients).where(eq(s.clients.id, user.clientId)))[0] : undefined;
    if (!client || client.archived) return null;
  }
  return { userId: user.id, role: user.role, clientId: user.clientId ?? undefined, name: user.name, email: user.email };
});

export async function requireOwner(): Promise<Session> {
  const sess = await getSession();
  if (!sess) redirect("/login");
  if (sess.role !== "owner") redirect("/portal");
  return sess;
}

export async function requireClient(): Promise<Session & { clientId: string }> {
  const sess = await getSession();
  if (!sess) redirect("/login");
  if (sess.role !== "client" || !sess.clientId) redirect("/studio");
  return sess as Session & { clientId: string };
}

export async function findUserByEmail(email: string) {
  return (await db.select().from(s.users).where(eq(s.users.email, email.trim().toLowerCase())))[0];
}

export async function ownerExists() {
  return (await db.select({ id: s.users.id }).from(s.users).where(eq(s.users.role, "owner")).limit(1)).length > 0;
}

/* ---------- Invite and reset tokens ---------- */

const hashToken = (raw: string) => createHash("sha256").update(raw).digest("hex");

export async function createAuthToken(userId: string, kind: "invite" | "reset") {
  const raw = randomBytes(32).toString("base64url");
  const ttlHours = kind === "invite" ? 24 * 14 : 2;
  // Only the newest link of each kind works.
  await db.delete(s.authTokens).where(and(eq(s.authTokens.userId, userId), eq(s.authTokens.kind, kind)));
  await db.insert(s.authTokens).values({
    id: newId("tok"),
    userId,
    kind,
    tokenHash: hashToken(raw),
    expiresAt: new Date(Date.now() + ttlHours * 3_600_000).toISOString(),
  });
  return raw;
}

export async function findValidToken(raw: string, kind: "invite" | "reset") {
  const row = (
    await db
      .select({ token: s.authTokens, user: s.users })
      .from(s.authTokens)
      .innerJoin(s.users, eq(s.users.id, s.authTokens.userId))
      .where(
        and(
          eq(s.authTokens.tokenHash, hashToken(raw)),
          eq(s.authTokens.kind, kind),
          isNull(s.authTokens.usedAt),
          gt(s.authTokens.expiresAt, new Date().toISOString()),
        ),
      )
  )[0];
  return row ?? null;
}

export async function markTokenUsed(id: string) {
  await db.update(s.authTokens).set({ usedAt: new Date().toISOString() }).where(eq(s.authTokens.id, id));
}

/* ---------- Simple login throttle (per server instance) ---------- */

const failures = new Map<string, { n: number; until: number }>();
export function loginBlocked(email: string) {
  const f = failures.get(email);
  return !!f && f.n >= 5 && f.until > Date.now();
}
export function recordLoginFailure(email: string) {
  const f = failures.get(email) ?? { n: 0, until: 0 };
  f.n += 1;
  f.until = Date.now() + 15 * 60_000;
  failures.set(email, f);
}
export const clearLoginFailures = (email: string) => failures.delete(email);

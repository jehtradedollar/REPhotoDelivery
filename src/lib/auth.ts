import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getClient } from "./data";
import type { Role, Session } from "./types";

// Demo auth: a cookie holding the role (and client id for agents).
// Swap for a real provider (Auth.js, Clerk, Cognito) before going live.
// The rest of the app only calls getSession / requireOwner / requireClient.

export const SESSION_COOKIE = "rpd_session";

export const OWNER = { name: "Jonathan", email: "jonathan@studio.example" };

export async function getSession(): Promise<Session | null> {
  const raw = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { role: Role; clientId?: string };
    if (parsed.role === "owner") return { role: "owner", ...OWNER };
    const client = parsed.clientId ? getClient(parsed.clientId) : undefined;
    if (!client) return null;
    return { role: "client", clientId: client.id, name: client.name, email: client.email };
  } catch {
    return null;
  }
}

export async function requireOwner(): Promise<Session> {
  const s = await getSession();
  if (!s) redirect("/login");
  if (s.role !== "owner") redirect("/portal");
  return s;
}

export async function requireClient(): Promise<Session & { clientId: string }> {
  const s = await getSession();
  if (!s) redirect("/login");
  if (s.role !== "client" || !s.clientId) redirect("/studio");
  return s as Session & { clientId: string };
}

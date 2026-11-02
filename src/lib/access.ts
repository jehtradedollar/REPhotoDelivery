import "server-only";
import { timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { getSession } from "./auth";
import type { Project } from "./types";

export type Viewer = { kind: "owner" | "client" | "link"; name: string };

function sameToken(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Who is looking at this project: the studio, the signed-in agent, or someone holding its delivery link. */
export async function viewerFor(project: Project, token?: string | null): Promise<Viewer | null> {
  const session = await getSession();
  if (session?.role === "owner") return { kind: "owner", name: session.name };
  if (session?.role === "client" && session.clientId === project.clientId) return { kind: "client", name: session.name };
  if (token && project.deliveryToken && sameToken(token, project.deliveryToken)) return { kind: "link", name: "Delivery link" };
  return null;
}

export async function projectByToken(token: string): Promise<Project | undefined> {
  if (!/^[\w-]{16,64}$/.test(token)) return undefined;
  return (await db.select().from(s.projects).where(eq(s.projects.deliveryToken, token)))[0];
}

export const isDelivered = (p: Project) => p.status === "delivered" || p.status === "archived";

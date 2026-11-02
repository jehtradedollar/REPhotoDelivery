import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { db, getProject, isUnlocked } from "@/lib/data";
import { storage } from "@/lib/integrations";

// Gatekeeper for originals: the agent must own the project and have paid.
export async function GET(req: NextRequest, { params }: { params: Promise<{ mediaId: string }> }) {
  const { mediaId } = await params;
  const session = await getSession();
  const item = db.media.find((m) => m.id === mediaId);
  const project = item && getProject(item.projectId);
  if (!session || !item || !project) return new NextResponse("Not found", { status: 404 });
  if (session.role === "client" && (project.clientId !== session.clientId || !isUnlocked(project))) {
    return new NextResponse("Payment required", { status: 402 });
  }
  if (session.role === "client") {
    db.activity.push({ id: `act_${Date.now()}`, at: new Date().toISOString(), kind: "download", text: `${session.name} downloaded ${item.filename}`, projectId: project.id, clientId: project.clientId });
  }
  const url = await storage.getDownloadUrl(item.storageKey, { filename: item.filename });
  return NextResponse.redirect(new URL(url, req.url));
}

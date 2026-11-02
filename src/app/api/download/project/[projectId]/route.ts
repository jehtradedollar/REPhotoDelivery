import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { db, getProject, isUnlocked } from "@/lib/data";
import { storage } from "@/lib/integrations";

export async function GET(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const session = await getSession();
  const project = getProject(projectId);
  if (!session || !project) return new NextResponse("Not found", { status: 404 });
  if (session.role === "client" && (project.clientId !== session.clientId || !isUnlocked(project))) {
    return new NextResponse("Payment required", { status: 402 });
  }
  if (session.role === "client") {
    const n = db.media.filter((m) => m.projectId === projectId).length;
    db.activity.push({ id: `act_${Date.now()}`, at: new Date().toISOString(), kind: "download", text: `${session.name} downloaded all ${n} files from ${project.address}`, projectId, clientId: project.clientId });
  }
  return NextResponse.redirect(new URL(await storage.getProjectArchiveUrl(projectId), req.url));
}

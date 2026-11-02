import { NextResponse, type NextRequest } from "next/server";
import { isDelivered, viewerFor } from "@/lib/access";
import { getClient, getMediaItem, getProject, isUnlocked, logActivity } from "@/lib/data";
import { storage } from "@/lib/integrations";
import { mlsFilename } from "@/lib/links";

// Gatekeeper for files. Agents (signed in, or holding the delivery link) need a
// delivered, paid project. ?v=mls serves the 2048px MLS copy instead of the original.
export async function GET(req: NextRequest, { params }: { params: Promise<{ mediaId: string }> }) {
  const { mediaId } = await params;
  const token = req.nextUrl.searchParams.get("t");
  const mls = req.nextUrl.searchParams.get("v") === "mls";
  const item = await getMediaItem(mediaId);
  const project = await getProject(item?.projectId);
  const viewer = project && (await viewerFor(project, token));
  if (!item || !project || !viewer || !item.storageKey) return new NextResponse("Not found", { status: 404 });
  if (viewer.kind !== "owner") {
    if (!isDelivered(project)) return new NextResponse("Not found", { status: 404 });
    if (!(await isUnlocked(project))) return new NextResponse("Payment required", { status: 402 });
    const who = viewer.kind === "link" ? `${(await getClient(project.clientId))?.name ?? "Agent"} (delivery link)` : viewer.name;
    await logActivity("download", `${who} downloaded ${item.filename}${mls ? " (MLS)" : ""}`, { projectId: project.id, clientId: project.clientId });
  }
  const useMls = mls && item.kind === "photo" && !!item.webKey;
  const url = await storage.getDownloadUrl(useMls ? item.webKey! : item.storageKey, { filename: useMls ? mlsFilename(item.filename) : item.filename });
  return NextResponse.redirect(new URL(url, req.url));
}

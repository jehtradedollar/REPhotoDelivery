import { downloadZip } from "client-zip";
import { NextResponse, type NextRequest } from "next/server";
import { isDelivered, viewerFor } from "@/lib/access";
import { getClient, getMedia, getProject, isUnlocked, logActivity } from "@/lib/data";
import { storage } from "@/lib/integrations";
import { mlsFilename } from "@/lib/links";
import { getStockItems } from "@/lib/stock";

export const runtime = "nodejs";
export const maxDuration = 300;

// Streams a project as one zip, straight from storage.
//   default   every original: photos, video, floor plans, local-area stock
//   ?v=mls    MLS-size photos (2048px, under 1 MB) plus floor plans; no video
export async function GET(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const token = req.nextUrl.searchParams.get("t");
  const mls = req.nextUrl.searchParams.get("v") === "mls";
  const project = await getProject(projectId);
  const viewer = project && (await viewerFor(project, token));
  if (!project || !viewer) return new NextResponse("Not found", { status: 404 });
  if (viewer.kind !== "owner") {
    if (!isDelivered(project)) return new NextResponse("Not found", { status: 404 });
    if (!(await isUnlocked(project))) return new NextResponse("Payment required", { status: 402 });
  }

  const folder = (k: string) => ({ photo: "Photos", video: "Video", floorplan: "Floor plans" })[k] ?? "Files";
  const entries: { name: string; key: string; at: string }[] = [];
  for (const m of await getMedia(projectId)) {
    if (!m.storageKey) continue;
    if (mls && m.kind === "video") continue;
    const useMls = mls && m.kind === "photo" && !!m.webKey;
    entries.push({ name: `${folder(m.kind)}/${useMls ? mlsFilename(m.filename) : m.filename}`, key: useMls ? m.webKey! : m.storageKey, at: m.uploadedAt });
  }
  for (const m of await getStockItems(project.stockPackIds)) {
    const useMls = mls && !!m.webKey;
    entries.push({ name: `Local area/${useMls ? mlsFilename(m.filename) : m.filename}`, key: useMls ? m.webKey! : m.storageKey, at: m.uploadedAt });
  }
  if (!entries.length) return new NextResponse("No files have been uploaded yet.", { status: 404 });

  async function* files() {
    for (const e of entries) {
      const obj = await storage.getObjectStream(e.key);
      if (obj) yield { name: e.name, input: obj.body, size: obj.size, lastModified: new Date(e.at) };
    }
  }
  if (viewer.kind !== "owner") {
    const who = viewer.kind === "link" ? `${(await getClient(project.clientId))?.name ?? "Agent"} (delivery link)` : viewer.name;
    await logActivity("download", `${who} downloaded all ${mls ? "MLS" : "full quality"} files from ${project.address}`, { projectId, clientId: project.clientId });
  }
  const name = (project.address.replace(/[^\w\- ]+/g, "").trim() || "media") + (mls ? " (MLS)" : "");
  const res = downloadZip(files());
  return new NextResponse(res.body, { headers: { "Content-Type": "application/zip", "Content-Disposition": `attachment; filename="${name}.zip"` } });
}

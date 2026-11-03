import { NextResponse, type NextRequest } from "next/server";
import { isDelivered, viewerFor } from "@/lib/access";
import { getProject, isUnlocked } from "@/lib/data";
import { storage } from "@/lib/integrations";
import { mlsFilename } from "@/lib/links";
import { getStockItems } from "@/lib/stock";

// Stock photos are downloadable only from a paid project that added that pack.
export async function GET(req: NextRequest, { params }: { params: Promise<{ projectId: string; stockId: string }> }) {
  const { projectId, stockId } = await params;
  const token = req.nextUrl.searchParams.get("t");
  const mls = req.nextUrl.searchParams.get("v") === "mls";
  const project = await getProject(projectId);
  const viewer = project && (await viewerFor(project, token));
  if (!project || !viewer) return new NextResponse("Not found", { status: 404 });
  const item = (await getStockItems(project.stockPackIds)).find((m) => m.id === stockId);
  if (!item) return new NextResponse("Not found", { status: 404 });
  if (viewer.kind !== "owner") {
    if (!isDelivered(project)) return new NextResponse("Not found", { status: 404 });
    if (!(await isUnlocked(project))) return new NextResponse("Payment required", { status: 402 });
  }
  const useMls = mls && !!item.webKey;
  const url = await storage.getDownloadUrl(useMls ? item.webKey! : item.storageKey, { filename: useMls ? mlsFilename(item.filename) : item.filename });
  return NextResponse.redirect(new URL(url, req.url));
}

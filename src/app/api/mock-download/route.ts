import { NextResponse, type NextRequest } from "next/server";

// Stands in for a presigned S3 URL while storage is mocked.
export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key") ?? "";
  const filename = (req.nextUrl.searchParams.get("filename") || key.split("/").pop() || "file") + ".txt";
  return new NextResponse(`Mock download for ${key}\n\nReal files will be served from S3 once storage is connected.\n`, {
    headers: { "Content-Type": "text/plain", "Content-Disposition": `attachment; filename="${filename.replace(/"/g, "")}"` },
  });
}

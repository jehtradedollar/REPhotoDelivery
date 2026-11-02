import { NextResponse } from "next/server";

// Accepts and discards uploads while storage is mocked.
export async function PUT() {
  return new NextResponse(null, { status: 200 });
}

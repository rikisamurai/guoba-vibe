import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db/client";
import { qrs } from "@/db/schema";
import { renderPng, renderSvg } from "@/lib/qr";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const rows = await db.select().from(qrs).where(eq(qrs.id, id)).limit(1);
  if (rows.length === 0) return new NextResponse("Not found", { status: 404 });
  const row = rows[0];

  const url = new URL(req.url);
  const format = (url.searchParams.get("format") ?? "png").toLowerCase();
  const filename = url.searchParams.get("filename") ?? `qr-${id}.${format}`;
  const widthRaw = Number(url.searchParams.get("w"));
  const width = Number.isFinite(widthRaw) && widthRaw > 0 ? widthRaw : 1024;

  if (format === "svg") {
    const svg = await renderSvg(row.url, { width, margin: 2 });
    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Content-Disposition": `attachment; filename="${filename.replace(/"/g, "")}"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  if (format === "png") {
    const buf = await renderPng(row.url, { width, margin: 2 });
    return new NextResponse(buf.slice(), {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="${filename.replace(/"/g, "")}"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  return new NextResponse("Unsupported format", { status: 400 });
}

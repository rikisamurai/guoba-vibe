import { ImageResponse } from "next/og";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { qrs } from "@/db/schema";
import { renderPng } from "@/lib/qr";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const rows = await db.select().from(qrs).where(eq(qrs.id, id)).limit(1);

  if (rows.length === 0) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            background: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 48,
          }}
        >
          QR not found
        </div>
      ),
      size,
    );
  }

  const row = rows[0];
  const png = await renderPng(row.url, { width: 480, margin: 1 });
  const buffer = Buffer.from(png);
  const dataUrl = `data:image/png;base64,${buffer.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#fff",
          display: "flex",
          padding: 60,
          gap: 60,
          alignItems: "center",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={dataUrl} width={480} height={480} alt="QR" />
        <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 20 }}>
          <div style={{ fontSize: 56, fontWeight: 700, color: "#0a0a0a" }}>
            {row.title}
          </div>
          <div
            style={{
              fontSize: 22,
              color: "#525252",
              fontFamily: "monospace",
              wordBreak: "break-all",
              lineHeight: 1.3,
            }}
          >
            {row.url}
          </div>
        </div>
      </div>
    ),
    size,
  );
}

import { NextResponse } from "next/server";
import { getAdminSession } from "@/auth/admin";

export async function GET() {
  const session = await getAdminSession();
  return NextResponse.json(
    { isAdmin: session !== null },
    { headers: { "Cache-Control": "no-store" } },
  );
}

import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const store = await cookies();
  const isAdmin = store.get("admin")?.value === "1";

  if (!isAdmin) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}

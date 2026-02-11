import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const store = await cookies();
  const ok = store.get("admin")?.value === "1";
  if (!ok)
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  return NextResponse.json({ ok: true }, { status: 200 });
}

import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ ok: true });

  // Сбрасываем cookie
  res.cookies.set({
    name: "admin_session",
    value: "",
    path: "/",
    expires: new Date(0),
    httpOnly: true,
    secure: true,
    sameSite: "lax",
  });

  return res;
}

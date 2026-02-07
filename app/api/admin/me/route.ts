import { NextResponse } from "next/server";
import crypto from "crypto";
import { cookies } from "next/headers";

function sign(payload: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export async function GET() {
  const secret = process.env.ADMIN_SESSION_SECRET || "";
  if (!secret) return NextResponse.json({ ok: false });

  // В этой версии Next cookies() может быть async
  const store = await cookies();
  const c = store.get("admin_session")?.value;
  if (!c) return NextResponse.json({ ok: false });

  const parts = c.split(".");
  // v1.<exp>.<sig>
  if (parts.length !== 3) return NextResponse.json({ ok: false });

  const payload = `${parts[0]}.${parts[1]}`;
  const sig = parts[2];

  const expected = sign(payload, secret);

  if (sig.length !== expected.length) return NextResponse.json({ ok: false });
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return NextResponse.json({ ok: false });
  }

  const exp = Number(parts[1]);
  if (!Number.isFinite(exp) || Date.now() > exp) return NextResponse.json({ ok: false });

  return NextResponse.json({ ok: true });
}

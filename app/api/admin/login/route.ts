import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import speakeasy from "speakeasy";

export const runtime = "nodejs";

function adminFilePath() {
  return path.join(process.cwd(), "data", "admin.json");
}

function readAdmin(): any {
  try {
    const p = adminFilePath();
    if (!fs.existsSync(p)) return {};
    return JSON.parse(fs.readFileSync(p, "utf-8") || "{}");
  } catch {
    return {};
  }
}

function readPasswordHash(): string {
  try {
    const j = readAdmin();
    return typeof j.passwordHash === "string" ? j.passwordHash.trim() : "";
  } catch {
    return "";
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  const password = String(body?.password || "");
  const code = String(body?.code || "").replace(/\s+/g, "");

  const storedHash = readPasswordHash();
  if (!storedHash) {
    // Без хэша мы не пускаем (чтобы не было случайного "пустого" входа).
    return NextResponse.json({ ok: false, error: "admin_not_configured" }, { status: 401 });
  }

  let ok = false;
  try {
    ok = await bcrypt.compare(password, storedHash);
  } catch {
    ok = false;
  }
  if (!ok) return NextResponse.json({ ok: false }, { status: 401 });

  // 2FA (если включено)
  const admin = readAdmin();
  const totpSecret = typeof admin.totpSecret === "string" ? admin.totpSecret.trim() : "";

  if (totpSecret) {
    const codeOk = speakeasy.totp.verify({
      secret: totpSecret,
      encoding: "base32",
      token: code,
      window: 1,
    });

    if (!codeOk) {
      return NextResponse.json({ ok: false, error: "need_2fa" }, { status: 401 });
    }
  }

  const res = NextResponse.json({ ok: true });

  // Простая сессия: cookie admin=1
  res.cookies.set({
    name: "admin",
    value: "1",
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: true, // на https
    maxAge: 60 * 60 * 24 * 30, // 30 дней
  });

  return res;
}

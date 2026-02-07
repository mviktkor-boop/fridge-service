import { NextResponse } from "next/server";
import crypto from "crypto";
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
    const p = adminFilePath();
    if (!fs.existsSync(p)) return "";
    const raw = fs.readFileSync(p, "utf-8");
    const j = JSON.parse(raw || "{}");
    const h = typeof j.passwordHash === "string" ? j.passwordHash.trim() : "";
    return h;
  } catch {
    return "";
  }
}

function sign(payload: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

function makeSessionCookie(sessionSecret: string) {
  const exp = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 дней
  const payload = `v1.${exp}`;
  const sig = sign(payload, sessionSecret);
  return `${payload}.${sig}`;
}

export async function POST(req: Request) {
  const sessionSecret = process.env.ADMIN_SESSION_SECRET || "";
  if (!sessionSecret) {
    return NextResponse.json({ ok: false, error: "admin_secret_missing" }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const password = String(body?.password || "");

  const storedHash = readPasswordHash();

  let ok = false;

  // 1) если уже есть хэш — проверяем по bcrypt
  if (storedHash) {
    try {
      ok = await bcrypt.compare(password, storedHash);
    } catch {
      ok = false;
    }
  } else {
    // 2) если хэша ещё нет — используем старый ADMIN_PASSWORD из env
    const envPass = process.env.ADMIN_PASSWORD || "";
    ok = Boolean(envPass) && password === envPass;
  }

  if (!ok) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  // 2FA (если включено)
  const admin = readAdmin();
  const totpSecret = typeof admin.totpSecret === "string" ? admin.totpSecret : "";

  if (totpSecret) {
    const code = String(body?.code || "").replace(/\s+/g, "");
    const codeOk = speakeasy.totp.verify({
      secret: totpSecret,
      encoding: "base32",
      token: code,
      window: 1,
    });

    if (!codeOk) {
      // оставим совместимое имя ошибки, чтобы UI мог показать "нужен 2FA"
      return NextResponse.json({ ok: false, error: "need_2fa" }, { status: 401 });
    }
  }

  const res = NextResponse.json({ ok: true });

  res.cookies.set({
    name: "admin_session",
    value: makeSessionCookie(sessionSecret),
    path: "/",
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: true,
    sameSite: "lax",
  });

  return res;
}

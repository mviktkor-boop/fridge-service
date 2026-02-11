import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import speakeasy from "speakeasy";
import * as QRCode from "qrcode";

export const runtime = "nodejs";

async function isAdminAuthed(): Promise<boolean> {
  const store = await cookies();
  return store.get("admin")?.value === "1";
}

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

function writeAdmin(next: any) {
  const p = adminFilePath();
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(p, JSON.stringify(next, null, 2), "utf-8");
}

function readPasswordHash(): string {
  const j = readAdmin();
  return typeof j.passwordHash === "string" ? j.passwordHash.trim() : "";
}

async function verifyPassword(password: string): Promise<boolean> {
  const storedHash = readPasswordHash();
  if (!storedHash) return false;
  try {
    return await bcrypt.compare(password, storedHash);
  } catch {
    return false;
  }
}

function getIssuer() {
  return process.env.NEXT_PUBLIC_SITE_NAME || "ViktorSar";
}

function getLabel() {
  return process.env.NEXT_PUBLIC_SITE_DOMAIN || "viktorsar.ru";
}

export async function GET() {
  if (!(await isAdminAuthed())) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  const admin = readAdmin();
  const enabled = Boolean(admin.totpSecret);

  if (enabled) {
    return NextResponse.json({ ok: true, enabled: true });
  }

  // Генерим секрет и сохраняем как pending, пока не подтвердили код
  const issuer = getIssuer();
  const label = getLabel();

  const secretObj = speakeasy.generateSecret({
    length: 20,
    name: `${issuer} (${label})`,
  });

  const pending = String(secretObj.base32 || "").trim();
  const otpauth = String(secretObj.otpauth_url || "").trim();

  admin.totpPendingSecret = pending;
  writeAdmin(admin);

  const qrDataUrl = otpauth ? await QRCode.toDataURL(otpauth) : "";

  return NextResponse.json({
    ok: true,
    enabled: false,
    secret: pending,
    otpauth,
    qrDataUrl,
  });
}

export async function POST(req: Request) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const action = String(body?.action || "");

  const admin = readAdmin();

  if (action === "verify") {
    const code = String(body?.code || "").replace(/\s+/g, "");
    const pending =
      typeof admin.totpPendingSecret === "string"
        ? admin.totpPendingSecret
        : "";

    if (!pending) {
      return NextResponse.json(
        { ok: false, error: "no_pending" },
        { status: 400 },
      );
    }

    const ok = speakeasy.totp.verify({
      secret: pending,
      encoding: "base32",
      token: code,
      window: 1,
    });

    if (!ok) {
      return NextResponse.json(
        { ok: false, error: "bad_code" },
        { status: 400 },
      );
    }

    admin.totpSecret = pending;
    delete admin.totpPendingSecret;
    writeAdmin(admin);

    return NextResponse.json({ ok: true, enabled: true });
  }

  if (action === "disable") {
    const password = String(body?.password || "");
    const code = String(body?.code || "").replace(/\s+/g, "");

    const secret = typeof admin.totpSecret === "string" ? admin.totpSecret : "";
    if (!secret) {
      return NextResponse.json(
        { ok: false, error: "not_enabled" },
        { status: 400 },
      );
    }

    const passOk = await verifyPassword(password);
    if (!passOk) {
      return NextResponse.json(
        { ok: false, error: "bad_password" },
        { status: 401 },
      );
    }

    const codeOk = speakeasy.totp.verify({
      secret,
      encoding: "base32",
      token: code,
      window: 1,
    });

    if (!codeOk) {
      return NextResponse.json(
        { ok: false, error: "bad_code" },
        { status: 400 },
      );
    }

    delete admin.totpSecret;
    delete admin.totpPendingSecret;
    writeAdmin(admin);

    return NextResponse.json({ ok: true, enabled: false });
  }

  return NextResponse.json({ ok: false, error: "bad_action" }, { status: 400 });
}

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";

function sign(payload: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

async function isAdminAuthed(): Promise<boolean> {
  const secret = process.env.ADMIN_SESSION_SECRET || "";
  if (!secret) return false;

  const store = await cookies();
  const c = store.get("admin_session")?.value;
  if (!c) return false;

  const parts = c.split(".");
  if (parts.length !== 3) return false;

  const payload = `${parts[0]}.${parts[1]}`;
  const sig = parts[2];

  const expected = sign(payload, secret);
  if (sig.length !== expected.length) return false;

  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  } catch {
    return false;
  }

  const exp = Number(parts[1]);
  if (!Number.isFinite(exp) || Date.now() > exp) return false;

  return true;
}

function adminFilePath() {
  return path.join(process.cwd(), "data", "admin.json");
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

function writePasswordHash(hash: string) {
  const p = adminFilePath();
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  let cur: any = {};
  try {
    if (fs.existsSync(p)) {
      cur = JSON.parse(fs.readFileSync(p, "utf-8") || "{}");
    }
  } catch {
    cur = {};
  }

  cur.passwordHash = hash;
  fs.writeFileSync(p, JSON.stringify(cur, null, 2), "utf-8");
}

export async function POST(req: Request) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const oldPassword = String(body?.oldPassword || "");
  const newPassword = String(body?.newPassword || "");

  if (newPassword.length < 6) {
    return NextResponse.json({ ok: false, error: "too_short" }, { status: 400 });
  }

  const storedHash = readPasswordHash();

  let oldOk = false;

  if (storedHash) {
    try {
      oldOk = await bcrypt.compare(oldPassword, storedHash);
    } catch {
      oldOk = false;
    }
  } else {
    const envPass = process.env.ADMIN_PASSWORD || "";
    oldOk = Boolean(envPass) && oldPassword === envPass;
  }

  if (!oldOk) {
    return NextResponse.json({ ok: false, error: "bad_old_password" }, { status: 401 });
  }

  const hash = await bcrypt.hash(newPassword, 10);
  writePasswordHash(hash);

  // Сбрасываем сессию, чтобы перелогиниться
  const res = NextResponse.json({ ok: true });
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

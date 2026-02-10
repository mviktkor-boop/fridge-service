import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";

async function isAdminAuthed(): Promise<boolean> {
  const store = await cookies();
  return store.get("admin")?.value === "1";
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
    return typeof j.passwordHash === "string" ? j.passwordHash.trim() : "";
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
    if (fs.existsSync(p)) cur = JSON.parse(fs.readFileSync(p, "utf-8") || "{}");
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
  if (!storedHash) {
    return NextResponse.json({ ok: false, error: "admin_not_configured" }, { status: 400 });
  }

  let oldOk = false;
  try {
    oldOk = await bcrypt.compare(oldPassword, storedHash);
  } catch {
    oldOk = false;
  }

  if (!oldOk) {
    return NextResponse.json({ ok: false, error: "bad_old_password" }, { status: 401 });
  }

  const hash = await bcrypt.hash(newPassword, 10);
  writePasswordHash(hash);

  // Сбрасываем сессию, чтобы перелогиниться
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: "admin",
    value: "",
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    maxAge: 0,
  });

  return res;
}

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import fs from "fs";
import path from "path";

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

function safeExt(mime: string) {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "";
}

export async function POST(req: Request) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ ok: false, error: "bad_form" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "no_file" }, { status: 400 });
  }

  const maxBytes = 20 * 1024 * 1024; // 5 MB
  if (file.size <= 0 || file.size > maxBytes) {
    return NextResponse.json({ ok: false, error: "file_too_large" }, { status: 400 });
  }

  const ext = safeExt(file.type);
  if (!ext) {
    return NextResponse.json({ ok: false, error: "bad_type" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const name = `about-${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${ext}`;

  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  const fullPath = path.join(uploadsDir, name);
  fs.writeFileSync(fullPath, buf);

  // Путь, который можно использовать в <img src="...">
  const publicUrl = `/uploads/${name}`;

  return NextResponse.json({ ok: true, url: publicUrl }, { status: 200 });
}

export async function DELETE(req: Request) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  if (!url || !url.startsWith("/uploads/")) {
    return NextResponse.json({ ok: false, error: "bad_url" }, { status: 400 });
  }

  const fullPath = path.join(process.cwd(), "public", url);

  try {
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch {
    return NextResponse.json({ ok: false, error: "delete_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

async function isAdminAuthed(): Promise<boolean> {
  const store = await cookies();
  return store.get("admin")?.value === "1";
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

  const maxBytes = 20 * 1024 * 1024; // 20 MB
  if (file.size <= 0 || file.size > maxBytes) {
    return NextResponse.json({ ok: false, error: "file_too_large" }, { status: 400 });
  }

  const ext = safeExt(file.type);
  if (!ext) {
    return NextResponse.json({ ok: false, error: "bad_type" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const name = `upload-${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${ext}`;

  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  const fullPath = path.join(uploadsDir, name);
  fs.writeFileSync(fullPath, buf);

  return NextResponse.json({ ok: true, url: `/uploads/${name}` }, { status: 200 });
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
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  } catch {
    return NextResponse.json({ ok: false, error: "delete_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}

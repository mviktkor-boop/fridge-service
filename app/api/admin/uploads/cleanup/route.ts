import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

type SiteSettings = {
  aboutPhotos?: string[];
};

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

function settingsPath() {
  return path.join(process.cwd(), "data", "site-settings.json");
}

function readUsedUploads(): Set<string> {
  try {
    const raw = fs.readFileSync(settingsPath(), "utf-8");
    const j = JSON.parse(raw || "{}") as SiteSettings;
    const arr = Array.isArray(j.aboutPhotos) ? j.aboutPhotos : [];
    const used = new Set<string>();
    for (const p of arr) {
      const s = String(p || "").trim();
      if (s.startsWith("/uploads/")) used.add(s);
    }
    return used;
  } catch {
    return new Set<string>();
  }
}

function listUploadFiles(): string[] {
  const dir = path.join(process.cwd(), "public", "uploads");
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir, { withFileTypes: true });
  return files
    .filter((d) => d.isFile())
    .map((d) => d.name)
    .filter((name) => !name.startsWith(".")); // на всякий случай
}

function computeOrphans() {
  const used = readUsedUploads();
  const files = listUploadFiles();

  const orphans = files
    .map((name) => ({ name, url: `/uploads/${name}` }))
    .filter((x) => !used.has(x.url));

  return { usedCount: used.size, totalFiles: files.length, orphans };
}

// GET — посмотреть, что будет удалено
export async function GET() {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { usedCount, totalFiles, orphans } = computeOrphans();
  return NextResponse.json(
    {
      ok: true,
      usedCount,
      totalFiles,
      orphanCount: orphans.length,
      orphans,
    },
    { status: 200 }
  );
}

// POST — удалить осиротевшие файлы
export async function POST() {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const dir = path.join(process.cwd(), "public", "uploads");
  const { usedCount, totalFiles, orphans } = computeOrphans();

  let deleted = 0;
  const failed: string[] = [];

  for (const o of orphans) {
    const full = path.join(dir, o.name);
    try {
      if (fs.existsSync(full)) {
        fs.unlinkSync(full);
        deleted += 1;
      }
    } catch {
      failed.push(o.url);
    }
  }

  return NextResponse.json(
    {
      ok: true,
      usedCount,
      totalFiles,
      orphanCount: orphans.length,
      deleted,
      failed,
    },
    { status: 200 }
  );
}

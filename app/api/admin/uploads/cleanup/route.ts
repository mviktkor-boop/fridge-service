import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

async function isAdminAuthed(): Promise<boolean> {
  const store = await cookies();
  return store.get("admin")?.value === "1";
}

function uploadsDir() {
  return path.join(process.cwd(), "public", "uploads");
}

function dataFile() {
  return path.join(process.cwd(), "data", "site-settings.json");
}

function listUploadFiles(): string[] {
  const dir = uploadsDir();
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((x) => !x.startsWith("."));
}

function getUsedUrlsFromSettings(): Set<string> {
  const p = dataFile();
  try {
    const raw = fs.readFileSync(p, "utf-8");
    const j = JSON.parse(raw || "{}");
    const used = new Set<string>();

    const hero = typeof j?.heroImage === "string" ? j.heroImage : "";
    if (hero.startsWith("/uploads/")) used.add(hero);

    const photos = Array.isArray(j?.aboutPhotos) ? j.aboutPhotos : [];
    for (const u of photos) {
      const s = String(u || "");
      if (s.startsWith("/uploads/")) used.add(s);
    }

    return used;
  } catch {
    return new Set<string>();
  }
}

export async function GET() {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const files = listUploadFiles();
  const used = getUsedUrlsFromSettings();

  const orphans = files
    .map((f) => `/uploads/${f}`)
    .filter((url) => !used.has(url))
    .map((url) => ({ url }));

  return NextResponse.json(
    {
      ok: true,
      totalFiles: files.length,
      usedCount: used.size,
      orphanCount: orphans.length,
      orphans,
    },
    { status: 200 }
  );
}

export async function POST() {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const files = listUploadFiles();
  const used = getUsedUrlsFromSettings();

  let deleted = 0;
  const failed: string[] = [];

  for (const f of files) {
    const url = `/uploads/${f}`;
    if (used.has(url)) continue;

    const full = path.join(uploadsDir(), f);
    try {
      if (fs.existsSync(full)) {
        fs.unlinkSync(full);
        deleted += 1;
      }
    } catch {
      failed.push(url);
    }
  }

  const left = listUploadFiles();
  const orphansLeft = left.map((f) => `/uploads/${f}`).filter((u) => !used.has(u));

  return NextResponse.json(
    {
      ok: true,
      totalFiles: left.length,
      usedCount: used.size,
      orphanCount: orphansLeft.length,
      deleted,
      failed,
    },
    { status: 200 }
  );
}

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import fs from "fs";
import path from "path";

type ReviewStatus = "pending" | "approved";

type Review = {
  id: string;
  name: string;
  text: string;
  createdAt: number;
  status: ReviewStatus;
};

async function isAdminAuthed(): Promise<boolean> {
  const store = await cookies();
  return store.get("admin")?.value === "1";
}

function dataPath() {
  const dir = path.join(process.cwd(), "data");
  const file = path.join(dir, "reviews.json");
  return { dir, file };
}

function readAll(): Review[] {
  const { dir, file } = dataPath();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8") || "[]");
  } catch {
    return [];
  }
}

function writeAll(list: Review[]) {
  const { dir, file } = dataPath();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(list, null, 2), "utf-8");
}

export async function GET() {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const all = readAll();
  return NextResponse.json(
    {
      ok: true,
      pending: all.filter((r) => r.status === "pending"),
      approved: all.filter((r) => r.status === "approved"),
    },
    { status: 200 }
  );
}

export async function POST(req: Request) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const action = String(body?.action || "");
  const id = String(body?.id || "");

  const all = readAll();
  const idx = all.findIndex((r) => r.id === id);
  if (idx === -1) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  if (action === "approve") {
    all[idx] = { ...all[idx], status: "approved" };
  } else if (action === "delete") {
    all.splice(idx, 1);
  } else {
    return NextResponse.json({ ok: false, error: "bad_action" }, { status: 400 });
  }

  writeAll(all);

  return NextResponse.json(
    {
      ok: true,
      pending: all.filter((r) => r.status === "pending"),
      approved: all.filter((r) => r.status === "approved"),
    },
    { status: 200 }
  );
}

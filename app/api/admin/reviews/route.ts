import { NextResponse } from "next/server";
import crypto from "crypto";
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
  // v1.<exp>.<sig>
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

function dataPath() {
  const dir = path.join(process.cwd(), "data");
  const file = path.join(dir, "reviews.json");
  return { dir, file };
}

function readAll(): Review[] {
  const { dir, file } = dataPath();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify([], null, 2), "utf-8");
    return [];
  }

  try {
    const raw = fs.readFileSync(file, "utf-8");
    const arr = JSON.parse(raw || "[]");
    if (!Array.isArray(arr)) return [];
    return arr as Review[];
  } catch {
    fs.writeFileSync(file, JSON.stringify([], null, 2), "utf-8");
    return [];
  }
}

function writeAll(items: Review[]) {
  const { dir, file } = dataPath();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(items, null, 2), "utf-8");
}

export async function GET() {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const all = readAll().sort((a, b) => b.createdAt - a.createdAt);
  const pending = all.filter((r) => r.status === "pending");
  const approved = all.filter((r) => r.status === "approved");

  return NextResponse.json({ ok: true, pending, approved }, { status: 200 });
}

export async function POST(req: Request) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const action = String(body?.action ?? "");
  const id = String(body?.id ?? "");

  if (!id) return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });

  const all = readAll();
  const idx = all.findIndex((r) => r.id === id);
  if (idx === -1) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  if (action === "approve") {
    all[idx].status = "approved";
  } else if (action === "delete") {
    all.splice(idx, 1);
  } else {
    return NextResponse.json({ ok: false, error: "bad_action" }, { status: 400 });
  }

  writeAll(all);

  const sorted = all.sort((a, b) => b.createdAt - a.createdAt);
  return NextResponse.json(
    {
      ok: true,
      pending: sorted.filter((r) => r.status === "pending"),
      approved: sorted.filter((r) => r.status === "approved"),
    },
    { status: 200 }
  );
}

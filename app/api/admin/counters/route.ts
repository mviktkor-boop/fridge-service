import { NextResponse } from "next/server";
import crypto from "crypto";
import { cookies } from "next/headers";
import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs";

function sign(payload: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

async function isAdmin(): Promise<boolean> {
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
  if (expected !== sig) return false;

  // expiry (parts[1]) is a number (ms)
  const exp = Number(parts[1]);
  if (!Number.isFinite(exp)) return false;
  if (Date.now() > exp) return false;

  return true;
}

function filePath() {
  return path.join(process.cwd(), "data", "counters.json");
}

type Counters = {
  yandexMetrikaId: string;
  googleTagId: string;
  customHtml: string;
};

const DEFAULTS: Counters = {
  yandexMetrikaId: "",
  googleTagId: "",
  customHtml: "",
};

async function readCounters(): Promise<Counters> {
  try {
    const p = filePath();
    const raw = await fs.readFile(p, "utf-8");
    const d = JSON.parse(raw);
    return {
      yandexMetrikaId: String(d?.yandexMetrikaId ?? ""),
      googleTagId: String(d?.googleTagId ?? ""),
      customHtml: String(d?.customHtml ?? ""),
    };
  } catch {
    return DEFAULTS;
  }
}

async function writeCounters(next: Counters) {
  const p = filePath();
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, JSON.stringify(next, null, 2) + "\n", "utf-8");
}

function clean(v: unknown) {
  return String(v ?? "").trim();
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const data = await readCounters();
  return NextResponse.json({ ok: true, data });
}

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const next: Counters = {
    yandexMetrikaId: clean(body.yandexMetrikaId),
    googleTagId: clean(body.googleTagId),
    customHtml: String(body.customHtml ?? ""),
  };

  // very light validation
  if (next.yandexMetrikaId && !/^\d{4,20}$/.test(next.yandexMetrikaId)) {
    return NextResponse.json({ ok: false, error: "bad_yandex_id" }, { status: 400 });
  }
  if (next.googleTagId && !/^[A-Za-z0-9\-_]{6,40}$/.test(next.googleTagId)) {
    return NextResponse.json({ ok: false, error: "bad_google_tag_id" }, { status: 400 });
  }
  if (next.customHtml.length > 200_000) {
    return NextResponse.json({ ok: false, error: "custom_html_too_large" }, { status: 400 });
  }

  await writeCounters(next);
  return NextResponse.json({ ok: true });
}

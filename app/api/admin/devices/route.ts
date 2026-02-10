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

  const exp = Number(parts[1]);
  if (!Number.isFinite(exp)) return false;
  if (Date.now() > exp) return false;

  return true;
}

const DEVICES_FILE = path.join(process.cwd(), "data", "admin-devices.json");

type DeviceEntry = {
  id: string;
  ip: string;
  userAgent: string;
  lastLoginAt: number;
  firstSeenAt: number;
  logins: number;
};

async function readDevices(): Promise<DeviceEntry[]> {
  try {
    const raw = await fs.readFile(DEVICES_FILE, "utf-8");
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.map((x) => ({
      id: String(x?.id ?? ""),
      ip: String(x?.ip ?? ""),
      userAgent: String(x?.userAgent ?? ""),
      lastLoginAt: Number(x?.lastLoginAt ?? 0),
      firstSeenAt: Number(x?.firstSeenAt ?? 0),
      logins: Number(x?.logins ?? 0),
    }));
  } catch {
    return [];
  }
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const items = await readDevices();
  items.sort((a, b) => b.lastLoginAt - a.lastLoginAt);
  return NextResponse.json({ ok: true, items });
}

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import fs from "fs/promises";
import path from "path";
import { cookies } from "next/headers";

const ADMIN_FILE = path.join(process.cwd(), "data/admin.json");

async function sendTelegram(text: string) {
  const token = process.env.TG_BOT_TOKEN;
  const chatId = process.env.TG_CHAT_ID;
  if (!token || !chatId) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  }).catch(() => {});
}

function getClientInfo(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const ua = request.headers.get("user-agent") || "unknown";
  return { ip, ua };
}

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    const raw = await fs.readFile(ADMIN_FILE, "utf-8");
    const admin = JSON.parse(raw);

    const ok = await bcrypt.compare(password, admin.passwordHash);
    if (!ok) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    (await cookies()).set("admin", "1", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });

    const { ip, ua } = getClientInfo(request);
    await sendTelegram(
      `🔐 Вход в админку\nIP: ${ip}\nUA: ${ua}`
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

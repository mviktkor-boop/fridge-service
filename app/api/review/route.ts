import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";

type ReviewStatus = "pending" | "approved";

type Review = {
  id: string;
  name: string;
  text: string;
  createdAt: number;
  status: ReviewStatus;
};

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

async function sendToTelegram(text: string) {
  const token = process.env.BOT_TOKEN || "";
  const chatId = process.env.CHAT_ID || "";
  if (!token || !chatId) return;

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  }).catch(() => {});
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  const name = String(body?.name ?? "").trim();
  const text = String(body?.text ?? body?.review ?? "").trim();

  if (!text || text.length < 5) {
    return NextResponse.json(
      { ok: false, error: "empty_review" },
      { status: 400 },
    );
  }

  const review: Review = {
    id: crypto.randomUUID
      ? crypto.randomUUID()
      : crypto.randomBytes(16).toString("hex"),
    name: name || "Без имени",
    text,
    createdAt: Date.now(),
    status: "pending",
  };

  // 1) Сохраняем в файл (pending)
  const all = readAll();
  all.push(review);
  writeAll(all);

  // 2) Отправляем в Telegram (как уведомление)
  const tgText =
    `📝 <b>Новый отзыв (ожидает одобрения)</b>\n` +
    `👤 <b>${escapeHtml(review.name)}</b>\n` +
    `💬 ${escapeHtml(review.text)}\n` +
    `🆔 <code>${review.id}</code>`;

  await sendToTelegram(tgText);

  return NextResponse.json({ ok: true });
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

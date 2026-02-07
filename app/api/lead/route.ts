import { NextResponse } from "next/server";

function clean(v: unknown) {
  return String(v ?? "").trim();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const name = clean(body.name);
    const phone = clean(body.phone);
    const model = clean(body.model);
    const problem = clean(body.problem);

    if (!phone || phone.length < 6) {
      return NextResponse.json({ ok: false, error: "invalid_phone" }, { status: 400 });
    }

    const token = process.env.TG_BOT_TOKEN;
    const chatId = process.env.TG_CHAT_ID;

    if (!token || !chatId) {
      return NextResponse.json({ ok: false, error: "tg_not_configured" }, { status: 500 });
    }

    const text =
      "🧊 Новая заявка (ремонт холодильника)\n" +
      `Имя: ${name || "—"}\n` +
      `Телефон: ${phone}\n` +
      `Модель: ${model || "—"}\n` +
      `Проблема: ${problem || "—"}\n` +
      `Время: ${new Date().toLocaleString("ru-RU")}`;

    const resp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
    });

    if (!resp.ok) {
      const details = await resp.text();
      return NextResponse.json({ ok: false, error: "tg_error", details }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
}

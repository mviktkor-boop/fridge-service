import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import fs from "fs";
import path from "path";

type SiteSettings = {
  phone: string;
  city: string;
  hours: string;
  heroTitle: string;
  heroSubtitle: string;
  leadText: string;
  benefits: string[];

  // ABOUT (видимый текст)
  aboutTitle: string;
  aboutText: string;
  aboutPhotos: string[];
};

function dataPath() {
  const dir = path.join(process.cwd(), "data");
  const file = path.join(dir, "site-settings.json");
  return { dir, file };
}

function defaults(): SiteSettings {
  return {
    phone: "12345678",
    city: "Саратов",
    hours: "9:00–21:00 ежедневно",
    heroTitle: "Ремонт холодильников на дому",
    heroSubtitle: "Выезд мастера • Диагностика • Ремонт в день обращения",
    leadText: "Заполните форму — заявка придёт в Telegram.",
    benefits: [
      "Работаем по Саратову и ближайшим районам",
      "Честная диагностика и согласование цены до ремонта",
      "Опыт, аккуратность, гарантия на выполненные работы",
    ],

    aboutTitle: "Обо мне",
    aboutText:
      "Я мастер по ремонту холодильников в Саратове. Работаю аккуратно, объясняю причины поломки и согласовываю стоимость до ремонта.",
    aboutPhotos: ["Фото 1", "Фото 2", "Фото 3"],
  };
}

function readSettings(): SiteSettings {
  const { dir, file } = dataPath();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  if (!fs.existsSync(file)) {
    const d = defaults();
    fs.writeFileSync(file, JSON.stringify(d, null, 2), "utf-8");
    return d;
  }

  try {
    const raw = fs.readFileSync(file, "utf-8");
    const parsed = JSON.parse(raw || "{}");
    const d = defaults();

    // ВАЖНО: мы специально игнорируем старые SEO-поля (seoTitle/seoDescription/aboutSeo*)
    // чтобы их наличие в site-settings.json не ломало админку.
    return {
      ...d,
      ...parsed,
      benefits: Array.isArray(parsed?.benefits) ? parsed.benefits : d.benefits,
      aboutPhotos: Array.isArray(parsed?.aboutPhotos) ? parsed.aboutPhotos : d.aboutPhotos,
    };
  } catch {
    const d = defaults();
    fs.writeFileSync(file, JSON.stringify(d, null, 2), "utf-8");
    return d;
  }
}

function writeSettings(s: SiteSettings) {
  const { dir, file } = dataPath();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(s, null, 2), "utf-8");
}

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

export async function GET() {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const s = readSettings();
  return NextResponse.json({ ok: true, settings: s }, { status: 200 });
}

export async function POST(req: Request) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));

  const cur = readSettings();
  const next: SiteSettings = { ...cur };

  if (typeof body.phone === "string") next.phone = body.phone.trim();
  if (typeof body.city === "string") next.city = body.city.trim();
  if (typeof body.hours === "string") next.hours = body.hours.trim();

  if (typeof body.heroTitle === "string") next.heroTitle = body.heroTitle.trim();
  if (typeof body.heroSubtitle === "string") next.heroSubtitle = body.heroSubtitle.trim();
  if (typeof body.leadText === "string") next.leadText = body.leadText.trim();

  if (Array.isArray(body.benefits)) {
    next.benefits = body.benefits
      .map((x: any) => String(x ?? "").trim())
      .filter((x: string) => x.length > 0)
      .slice(0, 10);
    if (next.benefits.length === 0) next.benefits = defaults().benefits;
  }

  // ABOUT (видимый текст)
  if (typeof body.aboutTitle === "string") next.aboutTitle = body.aboutTitle.trim();
  if (typeof body.aboutText === "string") next.aboutText = body.aboutText.trim();

  if (Array.isArray(body.aboutPhotos)) {
    next.aboutPhotos = body.aboutPhotos
      .map((x: any) => String(x ?? "").trim())
      .filter((x: string) => x.length > 0)
      .slice(0, 10);
    if (next.aboutPhotos.length === 0) next.aboutPhotos = defaults().aboutPhotos;
  }

  writeSettings(next);

  return NextResponse.json({ ok: true, settings: next }, { status: 200 });
}

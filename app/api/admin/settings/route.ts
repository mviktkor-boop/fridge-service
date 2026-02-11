import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import fs from "fs";
import path from "path";

type SiteSettings = {
  phone: string;
  city: string;
  hours: string;
  heroTitle: string;
  heroSubtitle: string;
  heroImage?: string;
  leadText: string;
  benefits: string[];

  // ABOUT (видимый текст)
  aboutTitle: string;
  aboutText: string;
  aboutPhotos: string[];
};

async function isAdminAuthed(): Promise<boolean> {
  const store = await cookies();
  return store.get("admin")?.value === "1";
}

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
    heroImage: "",
    leadText: "Заполните форму — заявка придёт в Telegram.",
    benefits: [
      "Работаем по Саратову и ближайшим районам",
      "Честная диагностика и согласование цены до ремонта",
      "Опыт, аккуратность, гарантия на выполненные работы",
    ],

    aboutTitle: "Обо мне",
    aboutText:
      "Я мастер по ремонту холодильников в Саратове. Работаю аккуратно, объясняю причины поломки и согласовываю стоимость до ремонта.",
    aboutPhotos: [],
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

    return {
      ...d,
      ...parsed,
      heroImage:
        typeof parsed?.heroImage === "string" ? parsed.heroImage : d.heroImage,
      benefits: Array.isArray(parsed?.benefits) ? parsed.benefits : d.benefits,
      aboutPhotos: Array.isArray(parsed?.aboutPhotos)
        ? parsed.aboutPhotos
        : d.aboutPhotos,
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

export async function GET() {
  if (!(await isAdminAuthed())) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  const s = readSettings();
  return NextResponse.json({ ok: true, settings: s }, { status: 200 });
}

export async function POST(req: Request) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  const body = await req.json().catch(() => ({}));

  const cur = readSettings();
  const next: SiteSettings = { ...cur };

  if (typeof body.phone === "string") next.phone = body.phone.trim();
  if (typeof body.city === "string") next.city = body.city.trim();
  if (typeof body.hours === "string") next.hours = body.hours.trim();

  if (typeof body.heroTitle === "string")
    next.heroTitle = body.heroTitle.trim();
  if (typeof body.heroSubtitle === "string")
    next.heroSubtitle = body.heroSubtitle.trim();
  if (typeof body.heroImage === "string")
    next.heroImage = body.heroImage.trim();
  if (typeof body.leadText === "string") next.leadText = body.leadText.trim();

  if (Array.isArray(body.benefits)) {
    next.benefits = body.benefits
      .map((x: any) => String(x ?? "").trim())
      .filter((x: string) => x.length > 0)
      .slice(0, 10);
    if (next.benefits.length === 0) next.benefits = defaults().benefits;
  }

  if (typeof body.aboutTitle === "string")
    next.aboutTitle = body.aboutTitle.trim();
  if (typeof body.aboutText === "string")
    next.aboutText = body.aboutText.trim();

  if (Array.isArray(body.aboutPhotos)) {
    next.aboutPhotos = body.aboutPhotos
      .map((x: any) => String(x ?? "").trim())
      .filter((x: string) => x.length > 0)
      .slice(0, 50);
  }

  writeSettings(next);
  return NextResponse.json({ ok: true, settings: next }, { status: 200 });
}

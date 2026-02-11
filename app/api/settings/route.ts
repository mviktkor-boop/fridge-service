import { NextResponse } from "next/server";
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
    phone: "",
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

export async function GET() {
  const settings = readSettings();
  return NextResponse.json({ ok: true, settings }, { status: 200 });
}

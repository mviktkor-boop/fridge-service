import type { Metadata } from "next";
import "./globals.css";
import fs from "fs";
import path from "path";

type SeoFile = {
  meta?: {
    siteName?: string;
    canonicalBase?: string;
  };
  pages?: {
    home?: { title?: string; description?: string };
    about?: { title?: string; description?: string };
  };
};

function readSeoFile(): SeoFile {
  try {
    const file = path.join(process.cwd(), "data", "seo.json");
    if (!fs.existsSync(file)) return {};
    const raw = fs.readFileSync(file, "utf-8");
    return JSON.parse(raw || "{}") as SeoFile;
  } catch {
    return {};
  }
}

// === SEO: берём из data/seo.json (редко меняется, админка не нужна) ===
export async function generateMetadata(): Promise<Metadata> {
  const seo = readSeoFile();
  const base = seo.meta?.canonicalBase || "https://viktorsar.ru";

  const titleDefault =
    seo.pages?.home?.title || "Ремонт холодильников в Саратове — выезд мастера, гарантия";

  const description =
    seo.pages?.home?.description ||
    "Ремонт холодильников на дому в Саратове. Выезд в день обращения, честные цены, гарантия.";

  return {
    metadataBase: new URL(base),
    title: {
      default: titleDefault,
      template: `%s — ${seo.meta?.siteName || "viktorsar.ru"}`,
    },
    description,
    robots: { index: true, follow: true },
    alternates: { canonical: "/" },
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}

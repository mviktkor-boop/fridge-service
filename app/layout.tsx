import type { Metadata } from "next";
import Script from "next/script";
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
  };
};

type SiteSettingsFile = {
  phone?: string;
  city?: string;
  hours?: string;
  heroImage?: string;
};

function readJson<T>(filePath: string): T | {} {
  try {
    if (!fs.existsSync(filePath)) return {};
    return JSON.parse(fs.readFileSync(filePath, "utf-8") || "{}");
  } catch {
    return {};
  }
}

function readSeo(): SeoFile {
  return readJson<SeoFile>(
    path.join(process.cwd(), "data", "seo.json"),
  ) as SeoFile;
}

function readSiteSettings(): SiteSettingsFile {
  return readJson<SiteSettingsFile>(
    path.join(process.cwd(), "data", "site-settings.json"),
  ) as SiteSettingsFile;
}

export async function generateMetadata(): Promise<Metadata> {
  const seo = readSeo();
  const base = seo.meta?.canonicalBase || "https://viktorsar.ru";

  return {
    metadataBase: new URL(base),
    title: seo.pages?.home?.title || "Ремонт холодильников в Саратове",
    description:
      seo.pages?.home?.description ||
      "Ремонт холодильников на дому в Саратове. Выезд мастера в день обращения.",
    robots: { index: true, follow: true },
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const seo = readSeo();
  const settings = readSiteSettings();

  const base = (seo.meta?.canonicalBase || "https://viktorsar.ru").replace(
    /\/+$/,
    "",
  );

  const city = settings.city?.replace("е", "") || "Саратов"; // исправляем "Саратове" → "Саратов"

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "Ремонт холодильников в Саратове",
    url: base,
    description:
      seo.pages?.home?.description ||
      "Ремонт холодильников на дому в Саратове. Выезд мастера в день обращения.",
    telephone: settings.phone || undefined,
    areaServed: {
      "@type": "City",
      name: city,
    },
    address: {
      "@type": "PostalAddress",
      addressLocality: city,
      addressCountry: "RU",
    },
    makesOffer: {
      "@type": "Offer",
      itemOffered: {
        "@type": "Service",
        name: "Ремонт холодильников на дому",
      },
    },
  };

  return (
    <html lang="ru">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd),
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

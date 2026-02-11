import type { Metadata } from "next";

import fs from "fs";
import path from "path";

type SeoFile = {
  meta?: { siteName?: string; canonicalBase?: string };
  pages?: { about?: { title?: string; description?: string } };
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

// ✅ SEO for /about from data/seo.json
export async function generateMetadata(): Promise<Metadata> {
  const seo = readSeoFile();
  const base = seo.meta?.canonicalBase || "https://viktorsar.ru";
  return {
    metadataBase: new URL(base),
    title: seo.pages?.about?.title || "Обо мне",
    description: seo.pages?.about?.description || "",
    alternates: { canonical: "/about" },
  };
}

type Settings = {
  phone?: string;
  city?: string;
  hours?: string;

  aboutTitle?: string;
  aboutText?: string;
  aboutPhotos?: string[];

  seoTitle?: string;
  seoDescription?: string;

  aboutSeoTitle?: string;
  aboutSeoDescription?: string;
};

async function getSettings(): Promise<Settings> {
  try {
    const base = process.env.NEXT_PUBLIC_SITE_URL || "https://viktorsar.ru";
    const res = await fetch(`${base}/api/settings`, { cache: "no-store" });
    const j = await res.json().catch(() => ({}));
    if (j?.ok && j.settings) return j.settings as Settings;
  } catch {
    // ignore
  }
  return {};
}


export default async function AboutPage() {
  const s = await getSettings();

  const phone = s.phone || "";
  const city = s.city || "Саратов";
  const hours = s.hours || "9:00–21:00 ежедневно";

  const title = s.aboutTitle || "Обо мне";
  const text =
    s.aboutText ||
    "Я мастер по ремонту холодильников в Саратове. Работаю аккуратно, объясняю причины поломки и согласовываю стоимость до ремонта.";

  const photos = Array.isArray(s.aboutPhotos) ? s.aboutPhotos : [];

  return (
    <main
      style={{
        maxWidth: 980,
        margin: "0 auto",
        padding: "0 16px 32px",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
      }}
    >
      <nav
        style={{
          display: "flex",
          gap: 10,
          padding: "12px 0 14px",
          marginBottom: 22,
          borderBottom: "1px solid rgba(0,0,0,0.15)",
        }}
      >
        <a
          href="/"
          style={{
            textDecoration: "none",
            fontWeight: 700,
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid rgba(0,0,0,0.18)",
            display: "inline-block",
          }}
        >
          Главная
        </a>
        <a
          href="/about"
          style={{
            textDecoration: "none",
            fontWeight: 700,
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid rgba(0,0,0,0.18)",
            display: "inline-block",
          }}
        >
          Обо мне
        </a>
      </nav>

      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ fontSize: 34, margin: 0 }}>{title}</h1>
          <p style={{ marginTop: 10, fontSize: 16, opacity: 0.85, whiteSpace: "pre-wrap" }}>
            {text}
          </p>
        </div>

        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 14, opacity: 0.75 }}>Телефон</div>
          <a
            href={`tel:${phone}`}
            style={{ fontSize: 22, fontWeight: 700, textDecoration: "none" }}
          >
            {phone}
          </a>
          <div style={{ marginTop: 6, fontSize: 14, opacity: 0.75 }}>{hours}</div>
          <div style={{ marginTop: 6, fontSize: 14, opacity: 0.75 }}>{city}</div>
        </div>
      </header>

      <section style={{ marginTop: 22 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Фото</h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
            marginTop: 14,
          }}
        >
          {photos.length ? (
            photos.map((p, i) => (
              <div
                key={`${i}-${p}`}
                style={{
                  border: "1px solid rgba(0,0,0,0.12)",
                  borderRadius: 14,
                  overflow: "hidden",
                  minHeight: 160,
                  background: "rgba(0,0,0,0.02)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {String(p).startsWith("/uploads/") ? (
                  <img
                    src={String(p)}
                    alt={`Фото ${i + 1}`}
                    style={{ width: "100%", height: 220, objectFit: "cover" }}
                    loading="lazy"
                  />
                ) : (
                  <div style={{ padding: 18, opacity: 0.85, textAlign: "center", whiteSpace: "pre-wrap" }}>
                    {String(p)}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div style={{ opacity: 0.75 }}>Фото пока не добавлены.</div>
          )}
        </div>

        <p style={{ marginTop: 10, opacity: 0.7 }}>
          Фото загружаются через админку и выводятся здесь автоматически.
        </p>
      </section>
    </main>
  );
}

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
    about?: { title?: string; description?: string };
  };
};

type CountersFile = {
  yandexMetrikaId?: string;
  googleTagId?: string;
  customHtml?: string;
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

function readCounters(): CountersFile {
  try {
    const p = path.join(process.cwd(), "data", "counters.json");
    if (!fs.existsSync(p)) return {};
    const raw = fs.readFileSync(p, "utf-8");
    const d = JSON.parse(raw || "{}");
    return {
      yandexMetrikaId: String(d?.yandexMetrikaId ?? ""),
      googleTagId: String(d?.googleTagId ?? ""),
      customHtml: String(d?.customHtml ?? ""),
    };
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
  const counters = readCounters();
  const ym = (counters.yandexMetrikaId || "").trim();
  const gtag = (counters.googleTagId || "").trim();
  const customHtml = counters.customHtml || "";

  return (
    <html lang="ru">
      <head>
        {/* Google tag (gtag.js) */}
        {gtag && (
          <>
            <Script
              id="gtag-src"
              src={`https://www.googletagmanager.com/gtag/js?id=${gtag}`}
              strategy="afterInteractive"
            />
            <Script
              id="gtag-init"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${gtag}');
`,
              }}
            />
          </>
        )}

        {}
        {ym && (
          <Script
            id="yandex-metrika"
            strategy="beforeInteractive"
            dangerouslySetInnerHTML={{
              __html: `
(function(m,e,t,r,i,k,a){
  m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
  m[i].l=1*new Date();
  for (var j = 0; j < document.scripts.length; j++) {
    if (document.scripts[j].src === r) { return; }
  }
  k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
})(window, document,'script','https://mc.yandex.ru/metrika/tag.js?id=${ym}', 'ym');

ym(${ym}, 'init', {ssr:true, webvisor:true, trackHash:true, clickmap:true, ecommerce:"dataLayer", referrer: document.referrer, url: location.href, accurateTrackBounce:true, trackLinks:true});
`,
            }}
          />
        )}
        {/* /Yandex.Metrika counter */}
      </head>

      <body>
        {ym && (
          <noscript>
            <div>
              <img
                src={`https://mc.yandex.ru/watch/${ym}`}
                style={{ position: "absolute", left: "-9999px" }}
                alt=""
              />
            </div>
          </noscript>
        )}

        {children}

        {/* Custom counters/html (advanced) */}
        {customHtml && <div dangerouslySetInnerHTML={{ __html: customHtml }} />}
      </body>
    </html>
  );
}

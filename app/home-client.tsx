"use client";

import { useEffect, useState } from "react";

type SendStatus = "idle" | "sending" | "ok" | "err";

type SiteSettings = {
  phone?: string;
  city?: string;
  hours?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  heroImage?: string; // фото мастера (из админки)
  leadText?: string;
  benefits?: string[];
};

type PublicReview = {
  id: string;
  name: string;
  rating?: number;
  text: string;
  createdAt: number;
};

function clampRating(n: number | undefined) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 5;
  return Math.max(1, Math.min(5, Math.round(v)));
}

function stars(n: number | undefined) {
  const val = clampRating(n);
  return "★".repeat(val) + "☆".repeat(5 - val);
}

export default function HomeClient({ initialSite }: { initialSite: SiteSettings }) {
  // Lead
  const [name, setName] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [model, setModel] = useState("");
  const [problem, setProblem] = useState("");
  const [status, setStatus] = useState<SendStatus>("idle");
  const [errorText, setErrorText] = useState("");

  // Review
  const [revName, setRevName] = useState("");
  const [revRating, setRevRating] = useState(5);
  const [revText, setRevText] = useState("");
  const [revStatus, setRevStatus] = useState<SendStatus>("idle");
  const [revError, setRevError] = useState("");

  // ВАЖНО: инициализируем из initialSite (сервер отдал HTML уже с телефоном)
  const [site, setSite] = useState<SiteSettings>(initialSite || {});
  const [reviews, setReviews] = useState<PublicReview[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/settings", { cache: "no-store" });
        const j = await r.json().catch(() => ({}));
        if (j?.ok && j?.settings) setSite(j.settings);
      } catch {
        // ignore
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/reviews", { cache: "no-store" });
        const j = await r.json().catch(() => ({}));
        if (j?.ok && Array.isArray(j.reviews)) setReviews(j.reviews);
      } catch {
        // ignore
      }
    })();
  }, []);

  async function submitLead() {
    setStatus("sending");
    setErrorText("");

    const phoneClean = leadPhone.trim().replace(/[^\d+]/g, "");
    if (!phoneClean || phoneClean.length < 6) {
      setStatus("err");
      setErrorText("Введите корректный телефон (минимум 6 цифр)");
      return;
    }

    const problemClean = problem.trim();
    if (problemClean.length < 5) {
      setStatus("err");
      setErrorText("Коротко опишите проблему (минимум 5 символов)");
      return;
    }

    try {
      const resp = await fetch("/api/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phoneClean,
          model: model.trim(),
          problem: problemClean,
        }),
      });

      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        const code = String(data?.error || "Ошибка отправки");
        setStatus("err");
        setErrorText(
          code === "invalid_phone"
            ? "Введите корректный телефон (минимум 6 цифр)"
            : code === "tg_not_configured"
              ? "Telegram не настроен на сервере"
              : "Ошибка отправки. Попробуйте ещё раз."
        );
        return;
      }

      setStatus("ok");
      setName("");
      setLeadPhone("");
      setModel("");
      setProblem("");
    } catch {
      setStatus("err");
      setErrorText("Сеть/сервер недоступен");
    }
  }

  async function submitReview() {
    setRevStatus("sending");
    setRevError("");

    const textClean = revText.trim();
    if (textClean.length < 10) {
      setRevStatus("err");
      setRevError("Отзыв слишком короткий (минимум 10 символов)");
      return;
    }

    try {
      const resp = await fetch("/api/review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: revName.trim(),
          rating: revRating,
          text: textClean,
        }),
      });

      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        const code = String(data?.error || "Ошибка отправки");
        setRevStatus("err");
        setRevError(
          code === "too_short"
            ? "Отзыв слишком короткий (минимум 10 символов)"
            : code === "tg_not_configured"
              ? "Telegram не настроен на сервере"
              : "Ошибка отправки. Попробуйте ещё раз."
        );
        return;
      }

      setRevStatus("ok");
      setRevName("");
      setRevRating(5);
      setRevText("");
    } catch {
      setRevStatus("err");
      setRevError("Сеть/сервер недоступен");
    }
  }

  const city = site?.city || "Саратов";
  const hours = site?.hours || "9:00–21:00 ежедневно";

  const sitePhoneRaw = site?.phone || "";
  const sitePhone = String(sitePhoneRaw).trim();
  const sitePhoneTel = sitePhone.replace(/[^\d+]/g, "");
  const telHref = sitePhoneTel ? `tel:${sitePhoneTel}` : undefined;

  const heroTitleRaw = (site?.heroTitle || "").trim();
  const heroSubtitleRaw = (site?.heroSubtitle || "").trim();

  const heroTitle =
    !heroTitleRaw || heroTitleRaw === "Ремонт холодильников на дому"
      ? `Ремонт холодильников в ${city} с выездом сегодня`
      : heroTitleRaw;

  const heroSubtitle =
    !heroSubtitleRaw || heroSubtitleRaw === "Выезд мастера • Диагностика • Ремонт в день обращения"
      ? "Выезд в день обращения • Диагностика • Ремонт на месте"
      : heroSubtitleRaw;

  // Фото мастера (из админки). Если не задано — используем дефолтное.
  const heroImageSrc = (site?.heroImage || "").trim() || "/hero-bg.jpg";

  // ALT под Яндекс (без переспама, но с городом)
  const altHero = `Частный мастер Виктор по ремонту холодильников на дому в ${city}`;

  function scrollToLeadForm() {
    try {
      document.getElementById("lead-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch {
      // ignore
    }
  }

  // SEO (2): небольшой «живой» абзац под блоком преимуществ
  const whyText =
    `Я — частный мастер по ремонту холодильников в ${city}. ` +
    `Работаю без посредников: цену согласуем до начала ремонта. ` +
    `Выезжаю на дом, ремонт выполняю на месте и даю гарантию на работу.`;

  const badges = ["Без посредников", "Выезд сегодня", "Гарантия"];

  return (
    <main className="pageRoot" style={{ maxWidth: 980, margin: "0 auto", padding: "18px 14px" }}>
      <nav style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
        <a href="/" style={{ fontWeight: 900, textDecoration: "none" }}>
          Главная
        </a>
        <a href="/about" style={{ opacity: 0.85, textDecoration: "none" }}>
          Обо мне
        </a>
      </nav>

      <header style={{ padding: 18, borderRadius: 16, border: "1px solid rgba(0,0,0,0.12)" }}>
        <div style={{ fontSize: 14, opacity: 0.8 }}>{city} • выезд на дом</div>

        <div className="heroGrid" style={{ display: "grid", gap: 18, alignItems: "start", marginTop: 12 }}>
          <div className="heroText">
            <h1 style={{ margin: 0, fontSize: 34, lineHeight: 1.1 }}>{heroTitle}</h1>
            <p style={{ marginTop: 10, marginBottom: 0, fontSize: 18, opacity: 0.9 }}>{heroSubtitle}</p>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
              <button
                type="button"
                onClick={scrollToLeadForm}
                style={{
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "none",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                Оставить заявку
              </button>

              {telHref && (
                <a
                  href={telHref}
                  style={{
                    padding: "12px 14px",
                    borderRadius: 12,
                    border: "1px solid rgba(0,0,0,0.18)",
                    textDecoration: "none",
                    fontWeight: 900,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#fff",
                    color: "#000",
                  }}
                >
                  Позвонить
                </a>
              )}
            </div>

            {/* SEO (3): телефон виден текстом в HTML + кликабельный */}
            <div style={{ marginTop: 14, display: "grid", gap: 4 }}>
              <div style={{ fontWeight: 800 }}>Телефон</div>

              {telHref ? (
                <a href={telHref} style={{ fontSize: 22, fontWeight: 900, textDecoration: "none" }}>
                  {sitePhone}
                </a>
              ) : (
                <div style={{ fontSize: 22, fontWeight: 900, opacity: 0.85 }}>{sitePhone || "—"}</div>
              )}

              <div style={{ fontSize: 14, opacity: 0.85 }}>{hours}</div>
            </div>
          </div>

          <aside
            className="heroPhoto"
            style={{
              borderRadius: 16,
              border: "1px solid rgba(0,0,0,0.12)",
              overflow: "hidden",
              background: "#fff",
            }}
          >
            <div style={{ background: "#f3f4f6" }}>
              <img
                src={heroImageSrc}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = "/hero-bg.jpg";
                }}
                alt={altHero}
                style={{
                  width: "100%",
                  display: "block",
                  objectFit: "contain",
                  aspectRatio: "4 / 3",
                  maxHeight: 420,
                }}
                loading="lazy"
              />
            </div>

            <div style={{ padding: 12, display: "grid", gap: 10, color: "#111" }}>
              <div style={{ display: "grid", gap: 2 }}>
                <div style={{ fontWeight: 900, color: "#111" }}>Виктор — частный мастер</div>
                <div style={{ fontSize: 13, opacity: 0.85, color: "#111" }}>
                  Ремонт холодильников на дому • {city}
                </div>
              </div>

              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {badges.map((b) => (
                  <span
                    key={b}
                    style={{
                      background: "rgba(0,0,0,0.06)",
                      border: "1px solid rgba(0,0,0,0.10)",
                      padding: "5px 10px",
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 800,
                      letterSpacing: 0.15,
                      color: "#111",
                    }}
                  >
                    {b}
                  </span>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </header>

      <section
        id="lead-form"
        style={{
          marginTop: 18,
          padding: 18,
          border: "1px solid rgba(0,0,0,0.12)",
          borderRadius: 14,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 20 }}>Оставить заявку</h2>
        <p style={{ marginTop: 8, opacity: 0.8 }}>{site?.leadText || "Заполните форму — заявка придёт в Telegram."}</p>

        <form
          style={{ display: "grid", gap: 10, marginTop: 14 }}
          onSubmit={(e) => {
            e.preventDefault();
            submitLead();
          }}
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Имя"
            autoComplete="name"
            style={{ padding: 12, borderRadius: 10, border: "1px solid rgba(0,0,0,0.2)" }}
          />
          <input
            value={leadPhone}
            onChange={(e) => setLeadPhone(e.target.value)}
            placeholder="Телефон * (например +7 999 123-45-67)"
            inputMode="tel"
            autoComplete="tel"
            style={{ padding: 12, borderRadius: 10, border: "1px solid rgba(0,0,0,0.2)" }}
          />
          <input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="Модель холодильника (необязательно)"
            style={{ padding: 12, borderRadius: 10, border: "1px solid rgba(0,0,0,0.2)" }}
          />
          <textarea
            value={problem}
            onChange={(e) => setProblem(e.target.value)}
            placeholder="Опишите проблему *"
            rows={4}
            style={{ padding: 12, borderRadius: 10, border: "1px solid rgba(0,0,0,0.2)" }}
          />

          <button
            type="submit"
            disabled={status === "sending"}
            style={{
              padding: "12px 14px",
              borderRadius: 12,
              border: "none",
              fontWeight: 700,
              cursor: status === "sending" ? "not-allowed" : "pointer",
              opacity: status === "sending" ? 0.7 : 1,
            }}
          >
            {status === "sending" ? "Отправка..." : "Отправить заявку"}
          </button>

          {status === "ok" && <div style={{ fontSize: 14, opacity: 0.9 }}>✅ Заявка отправлена. Скоро вам ответим.</div>}
          {status === "err" && <div style={{ fontSize: 14, opacity: 0.9 }}>❌ {errorText}</div>}
        </form>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Почему выбирают меня</h2>
        <ul style={{ marginTop: 10, lineHeight: 1.6, paddingLeft: 18 }}>
          {(site?.benefits && site.benefits.length
            ? site.benefits
            : [
                "Частный мастер — без колл-центров и посредников",
                "Приезжаю лично, ремонтирую на месте",
                "Честная цена до начала работ",
              ]
          )
            .slice(0, 3)
            .map((t, i) => (
              <li key={i}>{t}</li>
            ))}
        </ul>

        <p style={{ marginTop: 10, opacity: 0.9, lineHeight: 1.6 }}>{whyText}</p>
      </section>

      <section style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid rgba(0,0,0,0.15)" }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Отзывы</h2>
        {reviews.length === 0 ? (
          <p style={{ marginTop: 10, opacity: 0.8 }}>Пока нет одобренных отзывов.</p>
        ) : (
          <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
            {reviews.slice(0, 6).map((r) => (
              <div key={r.id} style={{ border: "1px solid rgba(0,0,0,0.12)", borderRadius: 14, padding: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 900, letterSpacing: 0.3 }}>{stars(r.rating)}</div>
                <div style={{ marginTop: 8, whiteSpace: "pre-wrap", opacity: 0.9 }}>
                  {`${r.name ? r.name.trim() + ": " : ""}${r.text}`}
                </div>
                <div style={{ marginTop: 10, fontSize: 13, opacity: 0.65 }}>
                  {new Date(r.createdAt).toLocaleString("ru-RU")}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* MOBILE: две кнопки */}
      {telHref && (
        <div className="mobileBar" role="navigation" aria-label="Быстрые действия">
          <a className="mobileBarCall" href={telHref} aria-label={`Позвонить ${sitePhone}`}>
            Позвонить
          </a>
          <button className="mobileBarBtn" type="button" onClick={scrollToLeadForm}>
            Оставить заявку
          </button>
        </div>
      )}

      <style>{`
        .pageRoot { padding-bottom: 32px; }
        .mobileBar { display: none; }

        .heroGrid { grid-template-columns: 1.15fr 0.85fr; }

        @media (max-width: 720px) {
          .heroGrid { grid-template-columns: 1fr !important; }
          .heroPhoto { margin-top: 12px; }

          .pageRoot { padding-bottom: 96px; }
          .mobileBar {
            display: flex;
            position: fixed;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 50;
            gap: 10px;
            padding: 10px 12px;
            background: rgba(255,255,255,0.92);
            border-top: 1px solid rgba(0,0,0,0.12);
            backdrop-filter: blur(8px);
          }
          .mobileBarCall {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 12px 12px;
            border-radius: 12px;
            border: 1px solid rgba(0,0,0,0.12);
            text-decoration: none;
            font-weight: 900;
            font-size: 16px;
            letter-spacing: 0.2px;
            color: #fff;
            background: #111;
          }
          .mobileBarBtn {
            flex: 1;
            padding: 12px 12px;
            border-radius: 12px;
            border: 1px solid rgba(0,0,0,0.12);
            font-weight: 900;
            font-size: 16px;
            cursor: pointer;
            background: #111;
            color: #fff;
          }
          .mobileBarBtn:active { transform: translateY(1px); }
          .mobileBarBtn:focus-visible { outline: 2px solid rgba(0,0,0,0.35); outline-offset: 2px; }
        }
      `}</style>
    </main>
  );
}

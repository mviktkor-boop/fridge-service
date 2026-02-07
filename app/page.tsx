"use client";

import { useEffect, useState } from "react";

export default function HomePage() {
  // Заявка
  const [name, setName] = useState("");
  // phone — зарезервировано под номер мастера (из настроек). Для формы используем leadPhone.
  const [leadPhone, setLeadPhone] = useState("");
  const [model, setModel] = useState("");
  const [problem, setProblem] = useState("");

  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "err">("idle");
  const [errorText, setErrorText] = useState("");

  // Отзыв
  const [revName, setRevName] = useState("");
  const [revRating, setRevRating] = useState(5);
  const [revText, setRevText] = useState("");

  const [revStatus, setRevStatus] = useState<"idle" | "sending" | "ok" | "err">("idle");
  const [revError, setRevError] = useState("");

type SiteSettings = {
  phone: string;
  city: string;
  hours: string;
  heroTitle: string;
  heroSubtitle: string;
  leadText: string;
  benefits: string[];
};

const [site, setSite] = useState<SiteSettings | null>(null);

type PublicReview = {
  id: string;
  name: string;
  rating?: number;
  text: string;
  createdAt: number;
};

const [reviews, setReviews] = useState<PublicReview[]>([]);


useEffect(() => {
  (async () => {
    try {
      const r = await fetch("/api/settings", { cache: "no-store" });
      const j = await r.json().catch(() => ({}));
      if (j?.ok) setSite(j.settings);
    } catch {
      // если API недоступен — просто остаёмся на хардкоде
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
  const sitePhoneRaw = site?.phone || "12345678";
  const sitePhone = sitePhoneRaw.trim();
  const sitePhoneTel = sitePhone.replace(/[^\d+]/g, "");

  const heroTitleRaw = (site?.heroTitle || "").trim();
  const heroSubtitleRaw = (site?.heroSubtitle || "").trim();

  const heroTitle =
    !heroTitleRaw || heroTitleRaw === "Ремонт холодильников на дому"
      ? "Ремонт холодильников в Саратове с выездом сегодня"
      : heroTitleRaw;

  const heroSubtitle =
    !heroSubtitleRaw || heroSubtitleRaw === "Выезд мастера • Диагностика • Ремонт в день обращения"
      ? "Выезд в день обращения • Диагностика • Ремонт на месте"
      : heroSubtitleRaw;

  const phoneHint = "Позвоните сейчас — отвечу сразу";
  const trustLine = "Частный мастер • Без посредников • Гарантия на работу";

  function scrollToLeadForm() {
    try {
      document.getElementById("lead-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch {
      // ignore
    }
  }

  function stars(n: number | undefined) {
    const val = Math.max(1, Math.min(5, Number.isFinite(Number(n)) ? Number(n) : 5));
    return "★".repeat(val) + "☆".repeat(5 - val);
  }

  return (
    <main
      className="pageRoot"
      style={{
        maxWidth: 980,
        margin: "0 auto",
        padding: "0 16px 32px",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
      }}
    >
      {/* НАВИГАЦИЯ (кнопки) */}
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

      {/* ШАПКА */}
      <section
        style={{
          marginTop: 0,
          padding: 18,
          borderRadius: 16,
          backgroundImage:
            "linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)), url(/hero-bg.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          color: "#fff",
        }}
      >
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
    <div style={{ fontSize: 14, opacity: 0.9 }}>{" "}{city} • выезд на дом</div>
    <h1 style={{ fontSize: 34, margin: "6px 0 0" }}>
      {heroTitle}
    </h1>
    <p style={{ marginTop: 10, fontSize: 16, opacity: 0.85 }}>
      {heroSubtitle}
    </p>
    <div style={{ marginTop: 8, fontSize: 13, opacity: 0.9 }}>{trustLine}</div>

    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
      <button
        type="button"
        onClick={scrollToLeadForm}
        style={{
          padding: "12px 14px",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.35)",
          background: "rgba(255,255,255,0.14)",
          color: "#fff",
          fontWeight: 800,
          cursor: "pointer",
        }}
      >
        Оставить заявку
      </button>

      <a
        href={`tel:${sitePhoneTel}`}
        style={{
          padding: "12px 14px",
          borderRadius: 12,
          border: "none",
          background: "#fff",
          color: "#000",
          fontWeight: 900,
          textDecoration: "none",
          display: "inline-block",
        }}
      >
        Позвонить
      </a>
    </div>
  </div>

  <div style={{ textAlign: "right" }}>
    <div style={{ fontSize: 14, opacity: 0.75 }}>Телефон</div>
    <div style={{ fontSize: 13, opacity: 0.9, marginTop: 4 }}>{phoneHint}</div>
    <a
      href={`tel:${sitePhoneTel}`}
      style={{ fontSize: 28, fontWeight: 800, textDecoration: "none", letterSpacing: 0.2 }}
    >
      {sitePhone}
    </a>
    <div style={{ marginTop: 6, fontSize: 14, opacity: 0.75 }}>
      {hours}
    </div>
  </div>
</header>
      </section>

      {/* ФОРМА ЗАЯВКИ */}
      <section
        id="lead-form"
        style={{
          marginTop: 28,
          padding: 18,
          border: "1px solid rgba(0,0,0,0.12)",
          borderRadius: 14,
          scrollMarginTop: 90,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 20 }}>Оставить заявку</h2>
        <p style={{ marginTop: 8, opacity: 0.8 }}>
          {site?.leadText || "Заполните форму — заявка придёт в Telegram."}
        </p>

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
            style={{
              padding: 12,
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.2)",
            }}
          />

          <input
            value={leadPhone}
            onChange={(e) => setLeadPhone(e.target.value)}
            placeholder="Телефон * (например +7 999 123-45-67)"
            inputMode="tel"
            autoComplete="tel"
            style={{
              padding: 12,
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.2)",
            }}
          />

          <input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="Модель холодильника (необязательно)"
            style={{
              padding: 12,
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.2)",
            }}
          />

          <textarea
            value={problem}
            onChange={(e) => setProblem(e.target.value)}
            placeholder="Опишите проблему *"
            rows={4}
            style={{
              padding: 12,
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.2)",
            }}
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

          {status === "ok" && (
            <div style={{ fontSize: 14, opacity: 0.9 }}>
              ✅ Заявка отправлена. Скоро вам ответим.
            </div>
          )}
          {status === "err" && (
            <div style={{ fontSize: 14, opacity: 0.9 }}>❌ {errorText}</div>
          )}
        </form>
      </section>

      {/* ФОРМА ОТЗЫВА */}
      <section
        style={{
          marginTop: 18,
          padding: 18,
          border: "1px solid rgba(0,0,0,0.12)",
          borderRadius: 14,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 20 }}>Оставить отзыв</h2>
        <p style={{ marginTop: 8, opacity: 0.8 }}>
          Отзыв придёт в Telegram и будет добавлен на сайт после модерации.
        </p>

        <form
          style={{ display: "grid", gap: 10, marginTop: 14 }}
          onSubmit={(e) => {
            e.preventDefault();
            submitReview();
          }}
        >
          <input
            value={revName}
            onChange={(e) => setRevName(e.target.value)}
            placeholder="Имя (необязательно)"
            autoComplete="name"
            style={{
              padding: 12,
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.2)",
            }}
          />

          <label style={{ fontSize: 14, opacity: 0.9 }}>
            Оценка:{" "}
            <select
              value={revRating}
              onChange={(e) => setRevRating(Number(e.target.value))}
              style={{
                marginLeft: 8,
                padding: "8px 10px",
                borderRadius: 10,
                border: "1px solid rgba(0,0,0,0.2)",
              }}
            >
              <option value={5}>5</option>
              <option value={4}>4</option>
              <option value={3}>3</option>
              <option value={2}>2</option>
              <option value={1}>1</option>
            </select>
          </label>

          <textarea
            value={revText}
            onChange={(e) => setRevText(e.target.value)}
            placeholder="Текст отзыва * (минимум 10 символов)"
            rows={4}
            style={{
              padding: 12,
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.2)",
            }}
          />

          <button
            type="submit"
            disabled={revStatus === "sending"}
            style={{
              padding: "12px 14px",
              borderRadius: 12,
              border: "none",
              fontWeight: 700,
              cursor: revStatus === "sending" ? "not-allowed" : "pointer",
              opacity: revStatus === "sending" ? 0.7 : 1,
            }}
          >
            {revStatus === "sending" ? "Отправка..." : "Отправить отзыв"}
          </button>

          {revStatus === "ok" && (
            <div style={{ fontSize: 14, opacity: 0.9 }}>
              ✅ Спасибо! Отзыв отправлен на модерацию.
            </div>
          )}
          {revStatus === "err" && (
            <div style={{ fontSize: 14, opacity: 0.9 }}>❌ {revError}</div>
          )}
        </form>
      </section>

      {/* ПРЕИМУЩЕСТВА */}
      <section style={{ marginTop: 24 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Почему выбирают нас</h2>
        <ul style={{ marginTop: 10, lineHeight: 1.6, paddingLeft: 18 }}>
  {(site?.benefits && site.benefits.length ? site.benefits : [
    "Работаем по Саратову и ближайшим районам",
    "Честная диагностика и согласование цены до ремонта",
    "Опыт, аккуратность, гарантия на выполненные работы",
  ]).slice(0, 3).map((t, i) => (
    <li key={i}>{t}</li>
  ))}
</ul>
      </section>

{/* ОТЗЫВЫ */}
<section style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid rgba(0,0,0,0.15)" }}>
  <h2 style={{ margin: 0, fontSize: 20 }}>Отзывы</h2>

  {reviews.length === 0 ? (
    <p style={{ marginTop: 10, opacity: 0.8 }}>Пока нет одобренных отзывов.</p>
  ) : (
    <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
      {reviews.slice(0, 6).map((r) => (
        <div
          key={r.id}
          style={{
            border: "1px solid rgba(0,0,0,0.12)",
            borderRadius: 14,
            padding: 14,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 900, letterSpacing: 0.3 }}>
            {stars(r.rating)}
          </div>

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

      {/* Мобильная панель: телефон всегда на виду + кнопка к форме */}
      <div className="mobileBar" role="navigation" aria-label="Быстрые действия">
        <a className="mobileBarPhone" href={`tel:${sitePhoneTel}`} aria-label={`Позвонить ${sitePhone}`}>
          {sitePhone}
        </a>
        <button className="mobileBarBtn" type="button" onClick={scrollToLeadForm}>
          Оставить заявку
        </button>
      </div>

      <style>{`
        .pageRoot { padding-bottom: 32px; }
        .mobileBar { display: none; }

        @media (max-width: 720px) {
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
          .mobileBarPhone {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 12px 12px;
            border-radius: 12px;
            border: 1px solid rgba(0,0,0,0.18);
            text-decoration: none;
            font-weight: 900;
            font-size: 18px;
            letter-spacing: 0.2px;
            color: #000;
            background: #fff;
          }
          .mobileBarBtn {
            flex: 1;
            padding: 12px 12px;
            border-radius: 12px;
            border: none;
            font-weight: 900;
            font-size: 16px;
            cursor: pointer;
          }
        }
      `}</style>
    </main>
  );
}

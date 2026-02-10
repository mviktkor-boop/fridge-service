"use client";

import { useEffect, useState } from "react";

type Status = "checking" | "guest" | "authed";

export default function AdminPage() {
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    checkMe();
  }, []);

  async function checkMe() {
    try {
      const r = await fetch("/api/admin/me", {
        credentials: "include",
        cache: "no-store",
      });

      if (!r.ok) {
        setStatus("guest");
        return;
      }

      const data = await r.json();
      setStatus(data.ok ? "authed" : "guest");
    } catch {
      setStatus("guest");
    }
  }

  /* ================= RENDER ================= */

  if (status === "checking") {
    return (
      <div style={{ padding: 40 }}>
        <h1>Админка</h1>
        <p>Проверка сессии…</p>
      </div>
    );
  }

  if (status === "guest") {
    return (
      <div style={{ padding: 40 }}>
        <h1>Админка</h1>
        <p>Введите пароль для входа</p>
        {/* твоя форма логина остаётся здесь */}
      </div>
    );
  }

  /* ======== AUTHTED ======== */
  return (
    <div style={{ padding: 40 }}>
      <h1>Админка</h1>

      <section style={{ marginTop: 20 }}>
        <h2>Настройки сайта</h2>
        <p>Телефон, город, часы, hero, SEO…</p>
      </section>

      <section style={{ marginTop: 20 }}>
        <h2>Отзывы</h2>
        <p>Модерация отзывов</p>
      </section>

      <section style={{ marginTop: 20 }}>
        <h2>Счётчики</h2>
        <p>Яндекс / Google / внутренние</p>
      </section>
    </div>
  );
}

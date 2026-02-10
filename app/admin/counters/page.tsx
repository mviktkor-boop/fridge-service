"use client";

import { useEffect, useState } from "react";

type Counters = {
  yandexMetrikaId: string;
  googleTagId: string;
  customHtml: string;
};

export default function AdminCountersPage() {
  const [status, setStatus] = useState<"loading" | "guest" | "authed">("loading");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string>("");

  const [data, setData] = useState<Counters>({
    yandexMetrikaId: "",
    googleTagId: "",
    customHtml: "",
  });

  async function check() {
    try {
      const r = await fetch("/api/admin/me", { cache: "no-store", credentials: "include" });
      const j = await r.json().catch(() => ({}));
      setStatus(j?.ok ? "authed" : "guest");
      return Boolean(j?.ok);
    } catch {
      setStatus("guest");
      return false;
    }
  }

  async function load() {
    setMsg("");
    const ok = await check();
    if (!ok) return;

    try {
      const r = await fetch("/api/admin/counters", { cache: "no-store", credentials: "include" });
      const j = await r.json().catch(() => ({}));
      if (j?.ok) setData(j.data);
      else setMsg("Не удалось загрузить настройки счётчиков.");
    } catch {
      setMsg("Не удалось загрузить настройки счётчиков.");
    }
  }

  async function save() {
    setSaving(true);
    setMsg("");
    try {
      const r = await fetch("/api/admin/counters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      const j = await r.json().catch(() => ({}));
      if (j?.ok) setMsg("✅ Сохранено");
      else setMsg("❌ Ошибка сохранения");
    } catch {
      setMsg("❌ Ошибка сети");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: 24 }}>
      <h1>Админка</h1>

      {status === "authed" && (
        <nav style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "12px 0 18px" }}>
          <a
            href="/admin"
            style={{
              padding: "8px 12px",
              borderRadius: 10,
              border: "1px solid #ddd",
              textDecoration: "none",
              color: "#111",
              background: "#fff",
            }}
          >
            Настройки
          </a>
          <a
            href="/admin/counters"
            style={{
              padding: "8px 12px",
              borderRadius: 10,
              border: "1px solid #ddd",
              textDecoration: "none",
              color: "#111",
              background: "#f7f7f7",
            }}
          >
            Счётчики
          </a>
          <a
            href="/admin/devices"
            style={{
              padding: "8px 12px",
              borderRadius: 10,
              border: "1px solid #ddd",
              textDecoration: "none",
              color: "#111",
              background: "#fff",
            }}
          >
            Устройства
          </a>
        </nav>
      )}

      {status === "loading" && <p>Загрузка…</p>}

      {status === "guest" && (
        <div style={{ padding: 16, border: "1px solid #eee", borderRadius: 12 }}>
          <p style={{ margin: 0 }}>
            Сначала войди в админку на странице{" "}
            <a href="/admin" style={{ fontWeight: 700 }}>
              /admin
            </a>
            .
          </p>
        </div>
      )}

      {status === "authed" && (
        <section style={{ display: "grid", gap: 14 }}>
          <div style={{ display: "grid", gap: 6 }}>
            <label style={{ fontWeight: 700 }}>Яндекс.Метрика ID</label>
            <input
              value={data.yandexMetrikaId}
              onChange={(e) => setData((s) => ({ ...s, yandexMetrikaId: e.target.value }))}
              placeholder="например: 12345678"
              style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd", maxWidth: 320 }}
            />
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <label style={{ fontWeight: 700 }}>Google Tag ID (GA4)</label>
            <input
              value={data.googleTagId}
              onChange={(e) => setData((s) => ({ ...s, googleTagId: e.target.value }))}
              placeholder="например: G-XXXXXXXXXX"
              style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd", maxWidth: 320 }}
            />
            <div style={{ fontSize: 12, opacity: 0.8 }}>
              Можно указывать как <b>G-XXXXXXXXXX</b>, так и <b>GT-...</b> — вставится как есть.
            </div>
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <label style={{ fontWeight: 700 }}>Свой подробный код (HTML)</label>
            <textarea
              value={data.customHtml}
              onChange={(e) => setData((s) => ({ ...s, customHtml: e.target.value }))}
              placeholder="<script>...</script>"
              rows={10}
              style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd", width: "100%" }}
            />
            <div style={{ fontSize: 12, opacity: 0.8 }}>
              Вставляется на сайт как есть. Используй только доверенный код.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button
              onClick={save}
              disabled={saving}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid #111",
                background: "#111",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              {saving ? "Сохранение…" : "Сохранить"}
            </button>
            {msg && <span>{msg}</span>}
          </div>
        </section>
      )}
    </main>
  );
}

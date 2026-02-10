"use client";

import { useEffect, useState } from "react";

type DeviceEntry = {
  id: string;
  ip: string;
  userAgent: string;
  lastLoginAt: number;
  firstSeenAt: number;
  logins: number;
};

export default function AdminDevicesPage() {
  const [status, setStatus] = useState<"loading" | "guest" | "authed">("loading");
  const [items, setItems] = useState<DeviceEntry[]>([]);
  const [msg, setMsg] = useState<string>("");

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
      const r = await fetch("/api/admin/devices", { cache: "no-store", credentials: "include" });
      const j = await r.json().catch(() => ({}));
      if (j?.ok) setItems(j.items || []);
      else setMsg("Не удалось загрузить устройства.");
    } catch {
      setMsg("Не удалось загрузить устройства.");
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
              background: "#fff",
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
              background: "#f7f7f7",
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
        <section style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button
              onClick={load}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid #111",
                background: "#111",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              Обновить
            </button>
            {msg && <span>{msg}</span>}
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: 8 }}>Когда</th>
                  <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: 8 }}>IP</th>
                  <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: 8 }}>Устройство</th>
                  <th style={{ textAlign: "right", borderBottom: "1px solid #eee", padding: 8 }}>Входов</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id}>
                    <td style={{ borderBottom: "1px solid #f2f2f2", padding: 8, whiteSpace: "nowrap" }}>
                      {it.lastLoginAt ? new Date(it.lastLoginAt).toLocaleString() : "-"}
                    </td>
                    <td style={{ borderBottom: "1px solid #f2f2f2", padding: 8, whiteSpace: "nowrap" }}>{it.ip}</td>
                    <td style={{ borderBottom: "1px solid #f2f2f2", padding: 8, minWidth: 240 }}>
                      <div style={{ fontSize: 12, opacity: 0.85 }}>{it.userAgent}</div>
                    </td>
                    <td style={{ borderBottom: "1px solid #f2f2f2", padding: 8, textAlign: "right" }}>{it.logins}</td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ padding: 12, opacity: 0.8 }}>
                      Пока пусто. Записи появляются после успешных входов в админку.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}

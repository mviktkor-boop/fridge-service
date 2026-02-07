"use client";

import { useEffect, useRef, useState } from "react";

type Review = {
  id: string;
  name: string;
  text: string;
  createdAt: number;
  status: "pending" | "approved";
};

type Settings = {
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

  // ABOUT (SEO) ✅ NEW
  aboutSeoTitle: string; // NEW
  aboutSeoDescription: string; // NEW
};

export default function AdminPage() {
  // LOGIN
  const [password, setPassword] = useState("");
  const [login2faCode, setLogin2faCode] = useState("");
  const [status, setStatus] = useState<"checking" | "guest" | "authed">("checking");
  const [msg, setMsg] = useState("");

  // (оставлено, чтобы ничего не ломать)
  const [code, setCode] = useState("");

  // SETTINGS
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saveMsg, setSaveMsg] = useState("");

  // REVIEWS
  const [pending, setPending] = useState<Review[]>([]);
  const [approved, setApproved] = useState<Review[]>([]);
  const [revMsg, setRevMsg] = useState("");

  // UPLOAD
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploadMsg, setUploadMsg] = useState("");

  // CLEANUP
  const [cleanupMsg, setCleanupMsg] = useState("");
  const [orphans, setOrphans] = useState<string[]>([]);

  // CHANGE PASSWORD
  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [passMsg, setPassMsg] = useState("");

  // 2FA SETTINGS (внутри админки)
  const [twoFaEnabled, setTwoFaEnabled] = useState<boolean | null>(null);
  const [twoFaQr, setTwoFaQr] = useState<string>("");
  const [twoFaSecret, setTwoFaSecret] = useState<string>("");
  const [twoFaCode, setTwoFaCode] = useState<string>("");
  const [twoFaMsg, setTwoFaMsg] = useState<string>("");
  const [twoFaDisablePass, setTwoFaDisablePass] = useState<string>("");

  async function checkMe() {
    try {
      const r = await fetch("/api/admin/me", { cache: "no-store" });
      const j = await r.json().catch(() => ({}));
      setStatus(j?.ok ? "authed" : "guest");
      return Boolean(j?.ok);
    } catch {
      setStatus("guest");
      return false;
    }
  }

  async function loadSettings() {
    setSaveMsg("");
    const r = await fetch("/api/admin/settings", { cache: "no-store" });
    const j = await r.json().catch(() => ({}));
    if (j?.ok) {
      const s = j.settings as Settings;
      setSettings({
        ...s,
        benefits: Array.isArray(s?.benefits) ? s.benefits : [],
        aboutPhotos: Array.isArray(s?.aboutPhotos) ? s.aboutPhotos : [],
      });
    }
  }

  async function loadReviews() {
    setRevMsg("");
    const r = await fetch("/api/admin/reviews", { cache: "no-store" });
    const j = await r.json().catch(() => ({}));
    if (j?.ok) {
      setPending(Array.isArray(j.pending) ? j.pending : []);
      setApproved(Array.isArray(j.approved) ? j.approved : []);
    }
  }

  useEffect(() => {
    (async () => {
      const ok = await checkMe();
      if (ok) {
        await loadSettings();
        await loadReviews();
      }
    })();
  }, []);

  useEffect(() => {
    if (status === "authed") load2fa();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function login() {
    setMsg("");
    try {
      const resp = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          password,
          code: login2faCode.replace(/\s+/g, ""),
        }),
      });

      const j = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        if (j?.error === "need_2fa") {
          setMsg("🔐 Включена 2FA — введи код из Google Authenticator.");
        } else {
          setMsg("❌ Неверный пароль (или админка не настроена).");
        }
        return;
      }

      const ok = await checkMe();
      if (ok) {
        await loadSettings();
        await loadReviews();
        setMsg("✅ Вход выполнен");
      } else {
        setMsg("❌ Не удалось проверить сессию");
      }

      setPassword("");
      setLogin2faCode("");
    } catch {
      setMsg("❌ Ошибка сервера.");
    }
  }

  async function logout() {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } finally {
      location.href = "/admin";
    }
  }

  async function load2fa() {
    setTwoFaMsg("");
    try {
      const r = await fetch("/api/admin/2fa", { cache: "no-store" });
      const j = await r.json().catch(() => ({}));

      if (!r.ok || !j?.ok) {
        setTwoFaMsg("❌ Не удалось загрузить 2FA");
        return;
      }

      setTwoFaEnabled(Boolean(j.enabled));
      setTwoFaQr(j.qrDataUrl || "");
      setTwoFaSecret(j.secret || "");
    } catch {
      setTwoFaMsg("❌ Ошибка запроса 2FA");
    }
  }

  async function verify2fa() {
    setTwoFaMsg("...");
    try {
      const r = await fetch("/api/admin/2fa", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "verify", code: twoFaCode.replace(/\s+/g, "") }),
      });
      const j = await r.json().catch(() => ({}));

      if (r.ok && j?.ok) {
        setTwoFaMsg("✅ 2FA включена");
        setTwoFaCode("");
        await load2fa();
      } else {
        const err = j?.error;
        if (err === "bad_code") setTwoFaMsg("❌ Неверный код");
        else if (err === "no_pending") setTwoFaMsg("❌ Секрет не создан (нажми «Показать QR»)");
        else setTwoFaMsg("❌ Не удалось включить 2FA");
      }
    } catch {
      setTwoFaMsg("❌ Ошибка запроса");
    }
  }

  async function disable2fa() {
    setTwoFaMsg("...");
    try {
      const r = await fetch("/api/admin/2fa", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "disable",
          password: twoFaDisablePass,
          code: twoFaCode.replace(/\s+/g, ""),
        }),
      });
      const j = await r.json().catch(() => ({}));

      if (r.ok && j?.ok) {
        setTwoFaMsg("✅ 2FA выключена");
        setTwoFaCode("");
        setTwoFaDisablePass("");
        await load2fa();
      } else {
        const err = j?.error;
        if (err === "bad_password") setTwoFaMsg("❌ Неверный пароль");
        else if (err === "bad_code") setTwoFaMsg("❌ Неверный код");
        else if (err === "not_enabled") setTwoFaMsg("❌ 2FA уже выключена");
        else setTwoFaMsg("❌ Не удалось выключить 2FA");
      }
    } catch {
      setTwoFaMsg("❌ Ошибка запроса");
    }
  }

  async function changePassword() {
    setPassMsg("...");
    try {
      const r = await fetch("/api/admin/password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ oldPassword: oldPass, newPassword: newPass }),
      });

      const j = await r.json().catch(() => ({}));

      if (r.ok && j?.ok) {
        setPassMsg("✅ Пароль изменён. Войдите снова.");
        setOldPass("");
        setNewPass("");
        setTimeout(() => {
          location.href = "/admin";
        }, 600);
      } else {
        const err = j?.error;
        if (err === "too_short") setPassMsg("❌ Новый пароль слишком короткий (минимум 6)");
        else if (err === "bad_old_password") setPassMsg("❌ Старый пароль неверный");
        else setPassMsg("❌ Не удалось сменить пароль");
      }
    } catch {
      setPassMsg("❌ Ошибка запроса");
    }
  }

  async function saveSettings() {
    if (!settings) return;
    setSaveMsg("Сохранение...");

    const r = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(settings),
    });

    const j = await r.json().catch(() => ({}));
    if (j?.ok) {
      setSettings({
        ...j.settings,
        benefits: Array.isArray(j.settings?.benefits) ? j.settings.benefits : [],
        aboutPhotos: Array.isArray(j.settings?.aboutPhotos) ? j.settings.aboutPhotos : [],
      });
      setSaveMsg("✅ Сохранено");
    } else {
      setSaveMsg("❌ Ошибка сохранения");
    }
  }

  async function reviewAction(action: "approve" | "delete", id: string) {
    setRevMsg("...");
    const r = await fetch("/api/admin/reviews", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, id }),
    });
    const j = await r.json().catch(() => ({}));
    if (j?.ok) {
      setPending(j.pending || []);
      setApproved(j.approved || []);
      setRevMsg(action === "approve" ? "✅ Одобрено" : "🗑 Удалено");
    } else {
      setRevMsg("❌ Ошибка");
    }
  }

  const fmt = (ts: number) => new Date(ts).toLocaleString("ru-RU");

  async function uploadPhoto(file: File) {
    if (!settings) return;

    setUploadMsg("Загрузка...");
    try {
      const fd = new FormData();
      fd.append("file", file);

      const r = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const j = await r.json().catch(() => ({}));

      if (!j?.ok || !j?.url) {
        setUploadMsg("❌ Не удалось загрузить");
        return;
      }

      const nextPhotos = [...(settings.aboutPhotos || [])];
      nextPhotos.push(String(j.url));
      setSettings({ ...settings, aboutPhotos: nextPhotos });
      setUploadMsg("✅ Загружено и добавлено (нажми «Сохранить»)");
    } catch {
      setUploadMsg("❌ Ошибка загрузки");
    }
  }

  async function removePhoto(idx: number) {
    if (!settings) return;

    const url = settings.aboutPhotos?.[idx];

    const next = [...(settings.aboutPhotos || [])];
    next.splice(idx, 1);
    setSettings({ ...settings, aboutPhotos: next });

    // физически удалить файл (если uploads)
    if (url && url.startsWith("/uploads/")) {
      try {
        await fetch(`/api/admin/upload?url=${encodeURIComponent(url)}`, { method: "DELETE" });
      } catch {
        // не блокируем UI
      }
    }
  }

  function movePhoto(from: number, to: number) {
    if (!settings) return;

    const arr = [...(settings.aboutPhotos || [])];
    if (from < 0 || from >= arr.length) return;
    if (to < 0 || to >= arr.length) return;

    const [item] = arr.splice(from, 1);
    arr.splice(to, 0, item);

    setSettings({ ...settings, aboutPhotos: arr });
  }

  async function previewCleanup() {
    setCleanupMsg("Проверяю...");
    setOrphans([]);
    try {
      const r = await fetch("/api/admin/uploads/cleanup", { cache: "no-store" });
      const j = await r.json().catch(() => ({}));
      if (j?.ok) {
        const list = Array.isArray(j.orphans) ? j.orphans : [];
        setOrphans(list.map((x: any) => String(x?.url ?? x ?? "")).filter(Boolean));
        setCleanupMsg(
          `Файлов всего: ${j.totalFiles}, используются: ${j.usedCount}, неиспользуемые: ${j.orphanCount}`
        );
      } else {
        setCleanupMsg("❌ Не удалось получить список");
      }
    } catch {
      setCleanupMsg("❌ Ошибка запроса");
    }
  }

  async function runCleanup() {
    setCleanupMsg("Удаляю...");
    try {
      const r = await fetch("/api/admin/uploads/cleanup", { method: "POST" });
      const j = await r.json().catch(() => ({}));
      if (j?.ok) {
        setCleanupMsg(
          `✅ Удалено: ${j.deleted} из ${j.orphanCount}. Всего: ${j.totalFiles}, используются: ${j.usedCount}` +
            (Array.isArray(j.failed) && j.failed.length ? ` (ошибки: ${j.failed.length})` : "")
        );
        setOrphans([]);
      } else {
        setCleanupMsg("❌ Очистка не выполнена");
      }
    } catch {
      setCleanupMsg("❌ Ошибка запроса");
    }
  }

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: 24 }}>
      <h1>Админка</h1>

      {/* ГОСТЬ: ФОРМА ВХОДА */}
      {status === "guest" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            login();
          }}
          style={{ maxWidth: 360, display: "grid", gap: 10 }}
        >
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Пароль"
          />

          <input
            type="text"
            value={login2faCode}
            onChange={(e) => setLogin2faCode(e.target.value.replace(/\s+/g, ""))}
            placeholder="Код 2FA (если включён)"
            inputMode="numeric"
          />

          <button type="submit" disabled={!password}>
            Войти
          </button>

          {msg && <div>{msg}</div>}
        </form>
      )}

      {/* АВТОРИЗОВАН */}
      {status === "authed" && settings && (
        <>
          {/* ВЫХОД */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
            <button type="button" onClick={logout}>
              Выйти
            </button>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveSettings();
            }}
            style={{ display: "grid", gap: 10 }}
          >
            <h2>Главная</h2>

            <input
              value={settings.city}
              onChange={(e) => setSettings({ ...settings, city: e.target.value })}
              placeholder="Город"
            />
            <input
              value={settings.phone}
              onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
              placeholder="Телефон"
            />
            <input
              value={settings.hours}
              onChange={(e) => setSettings({ ...settings, hours: e.target.value })}
              placeholder="Часы работы"
            />
            <input
              value={settings.heroTitle}
              onChange={(e) => setSettings({ ...settings, heroTitle: e.target.value })}
              placeholder="Заголовок"
            />
            <input
              value={settings.heroSubtitle}
              onChange={(e) => setSettings({ ...settings, heroSubtitle: e.target.value })}
              placeholder="Подзаголовок"
            />

            <textarea
              value={settings.leadText}
              onChange={(e) => setSettings({ ...settings, leadText: e.target.value })}
              rows={3}
              placeholder="Текст под формой заявки"
            />

            <div style={{ marginTop: 6, fontWeight: 900 }}>Почему выбирают нас</div>
            {[0, 1, 2].map((i) => (
              <input
                key={i}
                value={settings.benefits[i] || ""}
                onChange={(e) => {
                  const b = [...(settings.benefits || [])];
                  b[i] = e.target.value;
                  setSettings({ ...settings, benefits: b });
                }}
                placeholder={`Преимущество ${i + 1}`}
              />
            ))}

            <hr style={{ margin: "18px 0" }} />

            <h2>Страница «Обо мне»</h2>

            <input
              value={settings.aboutTitle || ""}
              onChange={(e) => setSettings({ ...settings, aboutTitle: e.target.value })}
              placeholder="Заголовок"
            />
            <textarea
              value={settings.aboutText || ""}
              onChange={(e) => setSettings({ ...settings, aboutText: e.target.value })}
              rows={5}
              placeholder="Текст страницы"
            />

            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => {
                  setUploadMsg("");
                  fileRef.current?.click();
                }}
              >
                Загрузить фото
              </button>

              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                style={{ display: "none" }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadPhoto(f);
                  e.currentTarget.value = "";
                }}
              />

              {uploadMsg && <span style={{ opacity: 0.85 }}>{uploadMsg}</span>}
            </div>

            {settings.aboutPhotos?.length ? (
              <div style={{ display: "grid", gap: 8 }}>
                {settings.aboutPhotos.map((url, idx) => (
                  <div
                    key={`${idx}-${url}`}
                    style={{
                      display: "flex",
                      gap: 12,
                      alignItems: "center",
                      justifyContent: "space-between",
                      border: "1px solid rgba(0,0,0,0.12)",
                      borderRadius: 12,
                      padding: 10,
                    }}
                  >
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      {url.startsWith("/uploads/") ? (
                        <img
                          src={url}
                          alt={`Фото ${idx + 1}`}
                          style={{
                            width: 80,
                            height: 60,
                            objectFit: "cover",
                            borderRadius: 8,
                            border: "1px solid rgba(0,0,0,0.15)",
                            background: "#fafafa",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 80,
                            height: 60,
                            borderRadius: 8,
                            border: "1px dashed rgba(0,0,0,0.2)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 12,
                            opacity: 0.6,
                          }}
                        >
                          нет фото
                        </div>
                      )}

                      <div style={{ fontSize: 12, opacity: 0.75, maxWidth: 420, overflowWrap: "anywhere" }}>
                        {url}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <button type="button" onClick={() => movePhoto(idx, idx - 1)} disabled={idx === 0} title="Вверх">
                        ↑
                      </button>

                      <button
                        type="button"
                        onClick={() => movePhoto(idx, idx + 1)}
                        disabled={idx === settings.aboutPhotos.length - 1}
                        title="Вниз"
                      >
                        ↓
                      </button>

                      <button type="button" onClick={() => removePhoto(idx)}>
                        Удалить
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ opacity: 0.75 }}>Фото пока не добавлены.</div>
            )}

            <div style={{ marginTop: 10, fontWeight: 900 }}>Очистка uploads</div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <button type="button" onClick={previewCleanup}>
                Показать что будет удалено
              </button>
              <button type="button" onClick={runCleanup}>
                Очистить неиспользуемые фото
              </button>
              {cleanupMsg && <span style={{ opacity: 0.85 }}>{cleanupMsg}</span>}
            </div>

            {orphans.length > 0 && (
              <div
                style={{
                  marginTop: 10,
                  border: "1px solid rgba(0,0,0,0.12)",
                  borderRadius: 12,
                  padding: 10,
                  display: "grid",
                  gap: 6,
                  maxHeight: 220,
                  overflow: "auto",
                }}
              >
                {orphans.map((u) => (
                  <div key={u} style={{ fontSize: 12, opacity: 0.8, overflowWrap: "anywhere" }}>
                    {u}
                  </div>
                ))}
              </div>
            )}

            <hr style={{ margin: "18px 0" }} />

            <hr style={{ margin: "18px 0" }} />

            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <button type="submit">Сохранить</button>
              {saveMsg && <div>{saveMsg}</div>}
            </div>
          </form>

          <hr style={{ margin: "18px 0" }} />

          <h2>Безопасность</h2>

          <div style={{ display: "grid", gap: 10, maxWidth: 360 }}>
            <input
              type="password"
              value={oldPass}
              onChange={(e) => setOldPass(e.target.value)}
              placeholder="Старый пароль"
            />
            <input
              type="password"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              placeholder="Новый пароль (минимум 6 символов)"
            />
            <button type="button" onClick={changePassword} disabled={!oldPass || !newPass}>
              Сменить пароль
            </button>
            {passMsg && <div style={{ opacity: 0.9 }}>{passMsg}</div>}
          </div>

          <hr style={{ margin: "18px 0" }} />
          <h3 style={{ margin: "0 0 10px" }}>Google Authenticator (2FA)</h3>

          <div style={{ display: "grid", gap: 10, maxWidth: 520 }}>
            <div style={{ opacity: 0.85 }}>
              Статус: <b>{twoFaEnabled === null ? "..." : twoFaEnabled ? "Включена" : "Выключена"}</b>
            </div>

            {!twoFaEnabled && (
              <>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button type="button" onClick={load2fa}>
                    Показать QR
                  </button>
                  {twoFaSecret && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(twoFaSecret);
                        setTwoFaMsg("✅ Секрет скопирован");
                      }}
                    >
                      Скопировать секрет
                    </button>
                  )}
                </div>

                {twoFaQr && (
                  <div
                    style={{
                      border: "1px solid rgba(0,0,0,0.12)",
                      borderRadius: 12,
                      padding: 12,
                      width: "fit-content",
                    }}
                  >
                    <img src={twoFaQr} alt="2FA QR" style={{ width: 220, height: 220 }} />
                  </div>
                )}

                <input
                  value={twoFaCode}
                  onChange={(e) => setTwoFaCode(e.target.value)}
                  placeholder="Код из приложения (6 цифр)"
                  inputMode="numeric"
                />

                <button type="button" onClick={verify2fa} disabled={!twoFaCode}>
                  Подтвердить и включить 2FA
                </button>
              </>
            )}

            {twoFaEnabled && (
              <>
                <input
                  type="password"
                  value={twoFaDisablePass}
                  onChange={(e) => setTwoFaDisablePass(e.target.value)}
                  placeholder="Пароль (для выключения)"
                />

                <input
                  value={twoFaCode}
                  onChange={(e) => setTwoFaCode(e.target.value)}
                  placeholder="Код из приложения (6 цифр)"
                  inputMode="numeric"
                />

                <button type="button" onClick={disable2fa} disabled={!twoFaDisablePass || !twoFaCode}>
                  Выключить 2FA
                </button>
              </>
            )}

            {twoFaMsg && <div style={{ opacity: 0.9 }}>{twoFaMsg}</div>}
          </div>

          <hr style={{ margin: "34px 0" }} />

          <h2>Отзывы</h2>

          <h3>Ожидают одобрения</h3>
          {pending.length === 0 ? (
            <div style={{ opacity: 0.75 }}>Пусто</div>
          ) : (
            pending.map((r) => (
              <div
                key={r.id}
                style={{
                  border: "1px solid rgba(0,0,0,0.12)",
                  borderRadius: 14,
                  padding: 14,
                  marginBottom: 10,
                }}
              >
                <b>{r.name}</b> — {fmt(r.createdAt)}
                <div style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{r.text}</div>
                <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                  <button type="button" onClick={() => reviewAction("approve", r.id)}>
                    Одобрить
                  </button>
                  <button type="button" onClick={() => reviewAction("delete", r.id)}>
                    Удалить
                  </button>
                </div>
              </div>
            ))
          )}

          <h3>Опубликованные</h3>
          {approved.length === 0 ? (
            <div style={{ opacity: 0.75 }}>Пусто</div>
          ) : (
            approved.map((r) => (
              <div
                key={r.id}
                style={{
                  border: "1px solid rgba(0,0,0,0.12)",
                  borderRadius: 14,
                  padding: 14,
                  marginBottom: 10,
                }}
              >
                <b>{r.name}</b> — {fmt(r.createdAt)}
                <div style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{r.text}</div>
                <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                  <button type="button" onClick={() => reviewAction("delete", r.id)}>
                    Удалить
                  </button>
                </div>
              </div>
            ))
          )}

          {revMsg && <div style={{ marginTop: 10 }}>{revMsg}</div>}
        </>
      )}
    </main>
  );
}

"use client";

import { useMemo, useState } from "react";

export default function LoginPage() {
  const [username, setU] = useState("");
  const [password, setP] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);
  const [shake, setShake] = useState(false);

  const canSubmit = useMemo(
    () => username.trim().length >= 3 && password.length >= 4,
    [username, password]
  );

  async function login() {
    if (loading) return;
    setMsg("");
    setLoading(true);

    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include", // ✅ cookie taşınsın
        body: JSON.stringify({ username, password }),
      });

      const j = await r.json();
      if (!j.ok) {
        setMsg(j.error || "Hata");
        setShake(true);
        setTimeout(() => setShake(false), 450);
        return;
      }

      window.location.href = "/";
    } catch {
      setMsg("Bağlantı hatası");
      setShake(true);
      setTimeout(() => setShake(false), 450);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen text-white relative overflow-hidden">
      <div className="fixed inset-0 -z-10 auth-bg" />

      <style jsx global>{`
        .auth-bg {
          position: fixed;
          inset: 0;
          background:
            radial-gradient(circle at 18% 18%, rgba(255, 0, 180, 0.55), transparent 42%),
            radial-gradient(circle at 82% 26%, rgba(255, 90, 230, 0.45), transparent 48%),
            radial-gradient(circle at 52% 86%, rgba(255, 0, 150, 0.60), transparent 54%),
            linear-gradient(120deg, #140014, #1a001f, #0a000d);
          animation: authMove 6s ease-in-out infinite alternate, authPulse 2.2s ease-in-out infinite;
          filter: saturate(190%) brightness(1.12);
        }
        .auth-bg::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            linear-gradient(to right, rgba(255, 80, 200, 0.18) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 80, 200, 0.18) 1px, transparent 1px);
          background-size: 40px 40px;
          opacity: 0.30;
          animation: gridScroll 8.5s linear infinite;
          mask-image: radial-gradient(circle at 50% 30%, rgba(0,0,0,1), rgba(0,0,0,0.15) 65%, rgba(0,0,0,0) 82%);
        }
        .auth-bg::after {
          content: "";
          position: absolute;
          inset: -50%;
          background:
            radial-gradient(circle, rgba(255,255,255,0.11) 0%, transparent 60%),
            repeating-linear-gradient(45deg, rgba(255,0,180,0.08), rgba(255,0,180,0.08) 2px, transparent 2px, transparent 6px);
          animation: noiseMove 4s linear infinite;
          mix-blend-mode: screen;
          opacity: 0.22;
        }
        @keyframes authMove { 0% { background-position: 0% 0%; } 100% { background-position: 100% 100%; } }
        @keyframes authPulse { 0%,100% { filter: brightness(1.04) saturate(170%); } 50% { filter: brightness(1.38) saturate(240%); } }
        @keyframes gridScroll { 0% { background-position: 0 0; } 100% { background-position: 0 40px; } }
        @keyframes noiseMove { 0% { transform: translate(0,0); } 100% { transform: translate(120px,120px); } }

        .rainbowTitle {
          font-weight: 900;
          text-transform: uppercase;
          background: linear-gradient(90deg,#ff004c,#ff7a00,#ffe600,#00ff85,#00c3ff,#7a00ff,#ff00c8,#ff004c);
          background-size: 520% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: rainbowShift 1.1s linear infinite;
        }
        @keyframes rainbowShift { 0% { background-position: 0% 50%; } 100% { background-position: 100% 50%; } }

        .glass { backdrop-filter: blur(12px); }

        .shake { animation: shake 450ms ease-in-out; }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }

        .spin { animation: spin 900ms linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      <section className="min-h-screen grid place-items-center px-6 py-12">
        <div
          className={[
            "w-full max-w-md rounded-[28px] border border-white/10 bg-black/40 p-7 shadow-[0_30px_120px_rgba(0,0,0,0.65)] glass",
            shake ? "shake" : "",
          ].join(" ")}
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-white/60">NINIBET</div>
              <h1 className="mt-1 text-3xl font-extrabold">
                <span className="rainbowTitle">Giriş</span>
              </h1>
              <p className="mt-2 text-sm text-white/70">Hesabına gir ve oyunlara devam et.</p>
            </div>
            <div className="h-12 w-12 rounded-2xl border border-white/10 bg-white/5 grid place-items-center">
              <span className="text-xl">🪙</span>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60">👤</span>
              <input
                className="w-full rounded-2xl bg-black/40 border border-white/10 pl-10 pr-4 py-3 outline-none focus:border-white/20 focus:bg-black/45"
                placeholder="Kullanıcı adı"
                value={username}
                onChange={(e) => setU(e.target.value)}
                autoComplete="username"
              />
            </div>

            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60">🔒</span>
              <input
                className="w-full rounded-2xl bg-black/40 border border-white/10 pl-10 pr-14 py-3 outline-none focus:border-white/20 focus:bg-black/45"
                placeholder="Şifre"
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setP(e.target.value)}
                autoComplete="current-password"
                onKeyDown={(e) => {
                  if (e.key === "Enter") login();
                }}
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-white/80 hover:bg-white/10"
              >
                {show ? "Gizle" : "Göster"}
              </button>
            </div>

            {msg && (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {msg}
              </div>
            )}

            <button
              onClick={login}
              disabled={!canSubmit || loading}
              className={[
                "mt-2 w-full rounded-2xl border border-white/10 px-4 py-3 font-extrabold transition",
                "bg-white/10 hover:bg-white/15",
                !canSubmit || loading ? "opacity-60 cursor-not-allowed" : "",
              ].join(" ")}
              type="button"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white spin" />
                  Giriş yapılıyor…
                </span>
              ) : (
                "Giriş Yap"
              )}
            </button>

            <div className="mt-4 flex items-center justify-between text-sm">
              <a className="text-white/70 hover:text-white" href="/">
                ← Ana sayfa
              </a>
              <a className="text-white/70 hover:text-white" href="/register">
                Kayıt ol →
              </a>
            </div>

            <div className="mt-4 text-[11px] text-white/45">
              Not: Bu site eğlence amaçlıdır. Gerçek para içermez.
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

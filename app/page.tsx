"use client";

import { useEffect, useState } from "react";

const COIN_KEY = "donkgames_coin_v1";

export default function Home() {
  const [coin, setCoin] = useState<number>(1000);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(COIN_KEY);
      if (raw !== null) {
        const n = Number(raw);
        if (Number.isFinite(n)) setCoin(n);
      }
    } catch {}
    setReady(true);
  }, []);

  function resetCoin() {
    setCoin(1000);
    try {
      localStorage.setItem(COIN_KEY, "1000");
    } catch {}
  }

  const games = [
    { name: "Blackjack", desc: "", href: "/blackjack", badge: "🃏" },
    { name: "Mines", desc: "", href: "/mines", badge: "💎" },
    { name: "Coinflip", desc: "Yazı-tura.", href: "/coinflip", badge: "🪙", soon: true },
    { name: "Dice", desc: "Zar at.", href: "/dice", badge: "🎲", soon: true },
    { name: "Slots", desc: "Slot.", href: "/slots", badge: "🎰", soon: true },
  ];

  const isRainbow = (name: string) => name === "Blackjack" || name === "Mines";

  return (
    <main className="min-h-screen text-white relative overflow-hidden">
      {/* 🔥 NEON PINK BACKGROUND */}
      <div className="fixed inset-0 -z-10 neon-bg" />

      <style jsx global>{`
        /* ================= NEON BACKGROUND ================= */
        .neon-bg {
          position: fixed;
          inset: 0;
          background:
            radial-gradient(circle at 15% 20%, rgba(255, 0, 180, 0.55), transparent 40%),
            radial-gradient(circle at 85% 30%, rgba(255, 80, 220, 0.45), transparent 45%),
            radial-gradient(circle at 50% 85%, rgba(255, 0, 150, 0.6), transparent 50%),
            linear-gradient(120deg, #140014, #1a001f, #0a000d);
          animation:
            neonMove 6s ease-in-out infinite alternate,
            neonPulse 2.2s ease-in-out infinite;
          filter: saturate(180%) brightness(1.15);
        }

        .neon-bg::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            linear-gradient(to right, rgba(255, 80, 200, 0.18) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 80, 200, 0.18) 1px, transparent 1px);
          background-size: 40px 40px;
          opacity: 0.35;
          animation: gridScroll 8s linear infinite;
        }

        .neon-bg::after {
          content: "";
          position: absolute;
          inset: -50%;
          background:
            radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 60%),
            repeating-linear-gradient(
              45deg,
              rgba(255,0,180,0.08),
              rgba(255,0,180,0.08) 2px,
              transparent 2px,
              transparent 6px
            );
          animation: noiseMove 4s linear infinite;
          mix-blend-mode: screen;
          opacity: 0.25;
        }

        @keyframes neonMove {
          0% { background-position: 0% 0%; }
          100% { background-position: 100% 100%; }
        }

        @keyframes neonPulse {
          0%,100% { filter: brightness(1.05) saturate(160%); }
          50% { filter: brightness(1.4) saturate(220%); }
        }

        @keyframes gridScroll {
          0% { background-position: 0 0; }
          100% { background-position: 0 40px; }
        }

        @keyframes noiseMove {
          0% { transform: translate(0,0); }
          100% { transform: translate(120px,120px); }
        }

        /* ================= GAME TITLES ================= */
        .rainbowTitle {
          font-weight: 900;
          text-transform: uppercase;
          background: linear-gradient(
            90deg,
            #ff004c,
            #ff7a00,
            #ffe600,
            #00ff85,
            #00c3ff,
            #7a00ff,
            #ff00c8,
            #ff004c
          );
          background-size: 520% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: rainbowShift 1.1s linear infinite;
        }

        @keyframes rainbowShift {
          0% { background-position: 0% 50%; }
          100% { background-position: 100% 50%; }
        }
      `}</style>

      {/* HEADER */}
      <header className="mx-auto max-w-6xl px-6 py-10 flex flex-wrap items-center justify-between gap-4">
        <div className="text-2xl font-extrabold tracking-tight">
          NINIBET
        </div>

        <div className="flex items-center gap-3 text-sm">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2">
            🪙 Coin: <span className="font-extrabold">{ready ? coin : "…"}</span>
          </div>
          <button
            onClick={resetCoin}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 hover:bg-white/10"
            type="button"
          >
            Coin Reset
          </button>
        </div>
      </header>

      {/* CONTENT */}
      <section className="mx-auto max-w-6xl px-6 pb-14">
        <div className="rounded-[28px] border border-white/10 bg-black/40 p-8 shadow-[0_30px_120px_rgba(0,0,0,0.65)] backdrop-blur">
          <h1 className="text-3xl font-extrabold">Oyunlar</h1>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {games.map((g) => (
              <a
                key={g.href}
                href={g.soon ? "#" : g.href}
                onClick={(e) => g.soon && e.preventDefault()}
                className="group rounded-[26px] border border-white/10 bg-black/35 p-6 transition hover:bg-black/50"
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/5 text-xl">
                    {g.badge}
                  </div>
                  <div
                    className={[
                      "text-xl font-extrabold",
                      isRainbow(g.name) ? "rainbowTitle" : "",
                    ].join(" ")}
                  >
                    {g.name}
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      <footer className="py-8 text-center text-xs text-white/45">
        © {new Date().getFullYear()} NINIBET
      </footer>
    </main>
  );
}

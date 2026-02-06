"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

const COIN_KEY = "donkgames_coin_v1";
const CURRENCY_SRC = "/currency.webp";

type TileState = "hidden" | "safe" | "mine";
type Phase = "idle" | "playing" | "end";
type Result = "WIN" | "LOSE";

type HistoryItem = {
  id: string;
  result: Result;
  mines: number;
  bet: number;
  mult: number;
  net: number;
};

let _id = 0;
function uid() {
  _id += 1;
  return String(_id);
}

function fmt(n: number) {
  if (!Number.isFinite(n)) return "0";
  const x = Math.round(n * 100) / 100;
  return x % 1 === 0 ? x.toFixed(0) : x.toFixed(2);
}

function clampInt(v: number, min: number, max: number) {
  if (!Number.isFinite(v)) return min;
  return Math.max(min, Math.min(max, Math.floor(v)));
}

/** hızlı ama casino gibi, abartısız */
function calcMultiplier(openedSafe: number, mines: number) {
  if (openedSafe <= 0) return 1.0;
  const difficulty = 1 + mines / 8;
  const m = 1 + openedSafe * (0.22 * difficulty) + Math.pow(openedSafe, 1.18) * (0.028 * difficulty);
  return Math.max(1.0, m);
}

/* ===== SVG ICONS (NO EMOJI) ===== */

function DiamondIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="donk_dg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="rgba(147,197,253,.98)" />
          <stop offset="1" stopColor="rgba(59,130,246,.98)" />
        </linearGradient>
      </defs>
      <path d="M12 26 L24 12 H40 L52 26 L32 58 Z" fill="rgba(59,130,246,.22)" stroke="url(#donk_dg)" strokeWidth="2.2" />
      <path d="M12 26 H52 L32 58 Z" fill="rgba(59,130,246,.12)" />
      <path d="M24 12 L32 26 L40 12" fill="rgba(147,197,253,.14)" />
      <path d="M32 26 L24 12" stroke="rgba(255,255,255,.38)" strokeWidth="2" />
      <path d="M32 26 L40 12" stroke="rgba(255,255,255,.30)" strokeWidth="2" />
    </svg>
  );
}

function BombIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="30" cy="38" r="18" fill="rgba(239,68,68,.16)" stroke="rgba(248,113,113,.98)" strokeWidth="2.2" />
      <path d="M45 12c4 0 7 3 7 7 0 3-2 6-5 7" fill="none" stroke="rgba(255,255,255,.55)" strokeWidth="3" />
      <path d="M39 26l10-10" stroke="rgba(248,113,113,.98)" strokeWidth="3" strokeLinecap="round" />
      <circle cx="51" cy="14" r="3" fill="rgba(248,113,113,.98)" />
      <path d="M18 46c4 6 12 10 20 8" fill="none" stroke="rgba(255,255,255,.20)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/* ===== TILE (mostly inline so globals.css cannot kill it) ===== */

function Tile({
  state,
  disabled,
  onClick,
  pulse,
  pressed,
  onPressStart,
  onPressEnd,
}: {
  state: TileState;
  disabled: boolean;
  onClick: () => void;
  pulse: boolean;
  pressed: boolean;
  onPressStart: () => void;
  onPressEnd: () => void;
}) {
  const isSafe = state === "safe";
  const isMine = state === "mine";

  const bg = isSafe ? "rgba(59,130,246,.18)" : isMine ? "rgba(239,68,68,.18)" : "rgba(0,0,0,.22)";
  const border = isSafe
    ? "1px solid rgba(59,130,246,.45)"
    : isMine
    ? "1px solid rgba(239,68,68,.45)"
    : "1px solid rgba(255,255,255,.14)";
  const glow = isSafe
    ? "inset 0 0 0 1px rgba(59,130,246,.22), 0 0 40px rgba(59,130,246,.12)"
    : isMine
    ? "inset 0 0 0 1px rgba(239,68,68,.22), 0 0 40px rgba(239,68,68,.12)"
    : "0 0 0 rgba(0,0,0,0)";

  const clickable = !disabled;

  return (
    <button
      type="button"
      disabled={disabled}
      tabIndex={-1}
      onMouseDown={(e) => e.preventDefault()}
      onPointerDown={(e) => {
        e.preventDefault();
        if (clickable) onPressStart();
      }}
      onPointerUp={(e) => {
        e.preventDefault();
        onPressEnd();
      }}
      onPointerCancel={(e) => {
        e.preventDefault();
        onPressEnd();
      }}
      onPointerLeave={(e) => {
        e.preventDefault();
        onPressEnd();
      }}
      onClick={() => {
        if (!clickable) return;
        onClick();
      }}
      style={{
        width: "100%",
        height: "100%",
        padding: 0,
        margin: 0,
        border: "none",
        background: "transparent",
        outline: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        WebkitAppearance: "none",
        appearance: "none",
        transform: "none",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 20,
          background: bg,
          border,
          boxShadow: glow,
          display: "grid",
          placeItems: "center",
          position: "relative",
          overflow: "hidden",
          transition: "transform .09s ease, filter .12s ease, border-color .12s ease",
          transform: pressed ? "scale(0.975)" : pulse ? "scale(0.99)" : "scale(1)",
          filter: pressed ? "brightness(1.08)" : "brightness(1.0)",
        }}
      >
        {/* subtle grid overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.22,
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)",
            backgroundSize: "16px 16px",
            pointerEvents: "none",
          }}
        />

        {/* click shimmer */}
        {pressed && (
          <div
            style={{
              position: "absolute",
              inset: -40,
              background: "linear-gradient(90deg, transparent, rgba(255,255,255,.12), transparent)",
              transform: "rotate(18deg)",
              animation: "donk_sweep .42s ease-out both",
              pointerEvents: "none",
            }}
          />
        )}

        {state === "hidden" ? (
          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: 22,
              border: "1px solid rgba(255,255,255,.14)",
              background: "rgba(255,255,255,.06)",
              display: "grid",
              placeItems: "center",
              boxShadow: "0 14px 35px rgba(0,0,0,.35)",
              position: "relative",
            }}
          >
            <svg width="26" height="26" viewBox="0 0 64 64" aria-hidden="true">
              <path d="M12 26 L24 12 H40 L52 26 L32 58 Z" fill="rgba(255,255,255,.03)" stroke="rgba(255,255,255,.20)" strokeWidth="2" />
              <path d="M24 12 L32 26 L40 12" fill="rgba(255,255,255,.02)" />
            </svg>
          </div>
        ) : (
          <div
            style={{
              width: 66,
              height: 66,
              borderRadius: 26,
              border: "1px solid rgba(255,255,255,.14)",
              background: "rgba(0,0,0,.16)",
              display: "grid",
              placeItems: "center",
              boxShadow: "0 18px 40px rgba(0,0,0,.35)",
              filter: isSafe ? "drop-shadow(0 0 18px rgba(59,130,246,.28))" : "drop-shadow(0 0 18px rgba(239,68,68,.22))",
              position: "relative",
              animation: pulse ? "donk_pop .18s ease-out both" : undefined,
            }}
          >
            {isSafe ? <DiamondIcon /> : <BombIcon />}
          </div>
        )}
      </div>
    </button>
  );
}

export default function MinesPage() {
  const [coin, setCoin] = useState(1000);
  const [betStr, setBetStr] = useState("50");
  const [mines, setMines] = useState(5);

  const [phase, setPhase] = useState<Phase>("idle");
  const [tiles, setTiles] = useState<TileState[]>(Array.from({ length: 25 }, () => "hidden"));

  const [openedSafe, setOpenedSafe] = useState(0);
  const [mult, setMult] = useState(1.0);

  // ✅ KEY HATASI FIX: iki farklı key
  const [multTextKey, setMultTextKey] = useState(0);
  const [multGlowKey, setMultGlowKey] = useState(0);

  const [resultBanner, setResultBanner] = useState<string | null>(null);
  const [bannerTone, setBannerTone] = useState<"win" | "lose" | "">("");
  const [bannerKey, setBannerKey] = useState(0);

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [busyCell, setBusyCell] = useState<number | null>(null);
  const [pulseIndex, setPulseIndex] = useState<number | null>(null);
  const [pressedIndex, setPressedIndex] = useState<number | null>(null);

  const mineSetRef = useRef<Set<number>>(new Set());
  const betRef = useRef(0);
  const settledRef = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(COIN_KEY);
      if (raw) {
        const n = Number(raw);
        if (Number.isFinite(n)) setCoin(n);
      }
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(COIN_KEY, String(coin));
    } catch {}
  }, [coin]);

  const bet = useMemo(() => {
    const n = Number(betStr);
    return Number.isFinite(n) ? n : 0;
  }, [betStr]);

  function bumpMultiplierAnim() {
    setMultTextKey((k) => k + 1);
    setMultGlowKey((k) => k + 1);
  }

  function resetRoundUI() {
    settledRef.current = false;
    setResultBanner(null);
    setBannerTone("");
    setBannerKey((k) => k + 1);

    setPulseIndex(null);
    setBusyCell(null);
    setPressedIndex(null);

    setTiles(Array.from({ length: 25 }, () => "hidden"));
    setOpenedSafe(0);
    setMult(1.0);
    bumpMultiplierAnim();
  }

  function startRound() {
    if (phase === "playing") return;

    const b = clampInt(bet, 1, 1_000_000);
    const m = clampInt(mines, 1, 24);
    if (b <= 0) return;
    if (b > coin) return;

    betRef.current = b;
    resetRoundUI();
    setPhase("playing");
    setCoin((c) => c - b);

    const s = new Set<number>();
    while (s.size < m) s.add(Math.floor(Math.random() * 25));
    mineSetRef.current = s;

    setMult(1.0);
    bumpMultiplierAnim();
  }

  function revealAllMines() {
    const minesSet = mineSetRef.current;
    setTiles((prev) =>
      prev.map((st, i) => {
        if (st !== "hidden") return st;
        if (minesSet.has(i)) return "mine";
        return st;
      })
    );
  }

  function revealAllSafe() {
    const minesSet = mineSetRef.current;
    setTiles((prev) =>
      prev.map((st, i) => {
        if (st !== "hidden") return st;
        if (minesSet.has(i)) return st;
        return "safe";
      })
    );
  }

  function showBanner(type: "win" | "lose", text: string) {
    setBannerTone(type);
    setResultBanner(text);
    setBannerKey((k) => k + 1);
  }

  function settle(result: Result, finalMult: number) {
    if (settledRef.current) return;
    settledRef.current = true;

    const b = betRef.current;
    const winAmount = result === "WIN" ? b * finalMult : 0;
    const net = result === "WIN" ? winAmount - b : -b;

    if (result === "WIN") setCoin((c) => c + winAmount);

    setHistory((prev) => [{ id: uid(), result, mines, bet: b, mult: finalMult, net }, ...prev].slice(0, 6));

    // ✅ oyun bitince mayınlar görünsün
    revealAllMines();
    setPhase("end");
  }

  function onTileClick(i: number) {
    if (phase !== "playing") return;
    if (busyCell !== null) return;
    if (tiles[i] !== "hidden") return;

    setBusyCell(i);
    setPulseIndex(i);

    const isMine = mineSetRef.current.has(i);

    setTiles((prev) => {
      const next = [...prev];
      next[i] = isMine ? "mine" : "safe";
      return next;
    });

    window.setTimeout(() => {
      setPulseIndex(null);

      if (isMine) {
        revealAllMines();
        showBanner("lose", "LOST");
        settle("LOSE", mult);
        setBusyCell(null);
        return;
      }

      const newOpened = openedSafe + 1;
      setOpenedSafe(newOpened);

      const newMult = calcMultiplier(newOpened, mines);
      setMult(newMult);
      bumpMultiplierAnim();

      if (newOpened >= 25 - mines) {
        revealAllSafe();
        showBanner("win", "WIN");
        settle("WIN", newMult);
        setBusyCell(null);
        return;
      }

      setBusyCell(null);
    }, 110);
  }

  function cashout() {
    if (phase !== "playing") return;
    if (openedSafe <= 0) return;

    revealAllSafe();
    const finalMult = calcMultiplier(openedSafe, mines);
    setMult(finalMult);
    bumpMultiplierAnim();

    showBanner("win", "WIN");
    settle("WIN", finalMult);
  }

  function resetToIdle() {
    if (phase === "playing") return;
    betRef.current = 0;
    mineSetRef.current = new Set();
    setPhase("idle");
    resetRoundUI();
  }

  const canDeal = phase === "idle" || phase === "end";
  const canPlay = phase === "playing";
  const lockInputs = !canDeal;

  // responsive tile height, GUARANTEED visible
  const cellH = "clamp(72px, 12vw, 96px)";

  return (
    <main className="page">
      <style>{`
        *{box-sizing:border-box}
        body{margin:0;background:#050508;color:white;font-family:ui-sans-serif,system-ui}
        .page{min-height:100vh}
        .centerWrap{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}

        .panel{
          width:min(980px,100%);
          border:1px solid rgba(255,255,255,.10);
          background:rgba(255,255,255,.05);
          border-radius:28px;
          padding:16px;
          box-shadow:0 30px 120px rgba(0,0,0,.55);
          position:relative;overflow:hidden;
        }
        .panel:before{
          content:"";position:absolute;inset:0;opacity:.7;
          background:
            radial-gradient(circle at 20% 10%, rgba(255,0,70,0.20), transparent 45%),
            radial-gradient(circle at 80% 20%, rgba(0,180,255,0.14), transparent 50%),
            radial-gradient(circle at 50% 90%, rgba(0,255,180,0.10), transparent 55%);
          pointer-events:none;
        }
        .panel:after{
          content:"";position:absolute;inset:0;opacity:.22;
          background:
            linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px);
          background-size:36px 36px;
          pointer-events:none;
        }

        .topbar{position:relative;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:8px}
        .back{
          color:rgba(255,255,255,.75);text-decoration:none;font-weight:1000;
          border:1px solid rgba(255,255,255,.12);background:rgba(0,0,0,.20);
          padding:10px 14px;border-radius:16px;
        }
        .back:hover{color:white}

        .coinBox{
          display:flex;align-items:center;gap:8px;
          border:1px solid rgba(255,255,255,.12);background:rgba(0,0,0,.20);
          padding:10px 14px;border-radius:16px;font-weight:1000;
          min-width:130px;justify-content:flex-end;
        }
        .coinBox img{width:18px;height:18px;image-rendering:pixelated}

        .historyBar{
          flex:1;display:flex;align-items:center;gap:8px;justify-content:center;
          min-height:44px;padding:6px 10px;border-radius:16px;
          border:1px solid rgba(255,255,255,.10);background:rgba(0,0,0,.16);
          overflow:hidden;
        }
        .historyEmpty{font-size:12px;font-weight:900;color:rgba(255,255,255,.65)}
        .hItem{
          display:flex;align-items:center;gap:8px;
          padding:8px 10px;border-radius:999px;
          border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);
          font-weight:1000;white-space:nowrap;
        }
        .hLabel{font-size:12px;letter-spacing:.02em}
        .hNet{font-size:12px;padding:4px 8px;border-radius:999px;border:1px solid rgba(255,255,255,.12);background:rgba(0,0,0,.18)}
        .hNet.pos{color:rgba(34,197,94,.95);border-color:rgba(34,197,94,.35)}
        .hNet.neg{color:rgba(239,68,68,.95);border-color:rgba(239,68,68,.35)}
        .hItem.win{border-color:rgba(34,197,94,.25)}
        .hItem.lose{border-color:rgba(239,68,68,.25)}

        .row{
          position:relative;display:grid;
          grid-template-columns: 260px 1fr auto;
          gap:14px;align-items:center;padding:8px;
        }
        @media (max-width:920px){
          .row{grid-template-columns:1fr}
          .actions{justify-content:center}
        }

        .multBox{
          border:1px solid rgba(255,255,255,.12);
          background:rgba(0,0,0,.22);
          border-radius:22px;
          padding:12px 14px;
          min-height:86px;
          position:relative;overflow:hidden;
          box-shadow: 0 0 35px rgba(59,130,246,.14);
        }
        .multBox.live{border-color: rgba(59,130,246,.55);box-shadow: 0 0 80px rgba(59,130,246,.22)}
        .multBox.win{border-color:rgba(34,197,94,.35);box-shadow:0 0 75px rgba(34,197,94,.14)}
        .multBox.lose{border-color:rgba(239,68,68,.35);box-shadow:0 0 75px rgba(239,68,68,.14)}
        .multTop{font-size:11px;font-weight:1000;letter-spacing:.18em;color:rgba(255,255,255,.65)}
        .multVal{margin-top:6px;font-size:34px;font-weight:1000;letter-spacing:.06em;text-shadow: 0 0 35px rgba(59,130,246,.28)}
        .multHint{margin-top:4px;font-size:12px;color:rgba(255,255,255,.60);font-weight:900}

        .label{font-size:12px;font-weight:1000;color:rgba(255,255,255,.65);margin-bottom:6px}
        .betInputWrap{
          display:flex;align-items:center;gap:8px;
          border:1px solid rgba(255,255,255,.12);background:rgba(0,0,0,.20);
          padding:10px 12px;border-radius:18px;width:fit-content;
        }
        .betInputWrap img{width:18px;height:18px;image-rendering:pixelated}
        .betInputWrap input{
          width:160px;background:transparent;border:none;outline:none;
          color:white;font-weight:1000;font-size:16px;
        }

        .minesRow{display:flex;gap:10px;flex-wrap:wrap}
        .actions{display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap}

        .btn, .miniBtn{
          border:1px solid rgba(255,255,255,.10);
          background:rgba(255,255,255,.06);
          color:white;
          padding:12px 16px;border-radius:18px;
          font-weight:1000;
          cursor:pointer;
          transition:transform .12s ease, filter .12s ease;
          user-select:none;
        }
        .miniBtn{padding:10px 14px;border-radius:16px}
        .btn:hover:not(:disabled), .miniBtn:hover:not(:disabled){transform:translateY(-1px);filter:brightness(1.06)}
        .btn:active:not(:disabled), .miniBtn:active:not(:disabled){transform:translateY(1px) scale(.99);filter:brightness(.98)}
        .btn:disabled, .miniBtn:disabled{opacity:.45;cursor:not-allowed;transform:none}
        .btn.primary{background:white;color:#0a0a12}
        .btn.sub{background:rgba(59,130,246,.14);border:1px solid rgba(59,130,246,.35)}
        .btn.danger{background:rgba(239,68,68,.14);border:1px solid rgba(239,68,68,.35)}
        .miniBtn.on{background:rgba(59,130,246,.18);border-color:rgba(59,130,246,.40);box-shadow:0 0 45px rgba(59,130,246,.14)}

        .gridWrap{display:flex;justify-content:center;padding:12px 8px 8px}
        .grid{
          width:min(600px,100%);
          display:grid;
          grid-template-columns:repeat(5, 1fr);
          gap:12px;
          grid-auto-rows: ${cellH};
          align-content:start;
        }

        .result{
          margin:12px 8px 6px;border-radius:24px;
          border:1px solid rgba(255,255,255,.12);
          background:rgba(0,0,0,.30);
          padding:16px 18px;text-align:center;
          font-weight:1000;font-size:26px;letter-spacing:.12em;
        }
        .result.win{color:#22c55e;text-shadow:0 0 35px rgba(34,197,94,.55); animation: donk_bannerWin .22s ease-out both;}
        .result.lose{color:#ef4444;text-shadow:0 0 35px rgba(239,68,68,.55); animation: donk_bannerLose .28s ease-out both;}

        @keyframes donk_sweep{
          0%{ transform: translate(-45px,-10px) rotate(18deg); opacity: 0; }
          20%{ opacity: .9; }
          100%{ transform: translate(260px,20px) rotate(18deg); opacity: 0; }
        }
        @keyframes donk_pop{
          0%{ transform: scale(.92); opacity: .7; }
          100%{ transform: scale(1); opacity: 1; }
        }
        @keyframes donk_glow{
          0%{ opacity: 0; transform: scale(.95); }
          35%{ opacity: .75; transform: scale(1.02); }
          100%{ opacity: 0; transform: scale(1.08); }
        }
        @keyframes donk_multPop{
          0%{ transform: translateY(4px) scale(.98); filter: brightness(1.0); }
          55%{ transform: translateY(-1px) scale(1.03); filter: brightness(1.08); }
          100%{ transform: translateY(0) scale(1); filter: brightness(1.0); }
        }
        @keyframes donk_bannerWin{
          0%{ transform: translateY(14px) scale(.97); opacity:.65; }
          100%{ transform: translateY(0) scale(1); opacity:1; }
        }
        @keyframes donk_bannerLose{
          0%{ transform: translateY(14px) scale(.97); opacity:.65; }
          35%{ transform: translateY(0) scale(1) translateX(-3px); }
          55%{ transform: translateY(0) scale(1) translateX(3px); }
          75%{ transform: translateY(0) scale(1) translateX(-2px); }
          100%{ transform: translateY(0) scale(1) translateX(0); opacity:1; }
        }
      `}</style>

      <div className="centerWrap">
        <div className="panel">
          <header className="topbar">
            <a className="back" href="/">
              ← Geri
            </a>

            <div className="historyBar">
              {history.length === 0 ? (
                <span className="historyEmpty">History: —</span>
              ) : (
                history.map((h) => (
                  <span key={h.id} className={`hItem ${h.result.toLowerCase()}`}>
                    <span className="hLabel">
                      {h.result} • {h.mines}M • {fmt(h.mult)}x
                    </span>
                    <span className={`hNet ${h.net >= 0 ? "pos" : "neg"}`}>
                      {h.net >= 0 ? "+" : ""}
                      {fmt(h.net)}
                    </span>
                  </span>
                ))
              )}
            </div>

            <div className="coinBox">
              <img src={CURRENCY_SRC} alt="currency" />
              <b>{fmt(coin)}</b>
            </div>
          </header>

          <div className="row">
            <div className={`multBox ${canPlay ? "live" : ""} ${bannerTone}`}>
              <div key={multGlowKey} style={{ position: "absolute", inset: -40, background: "radial-gradient(circle at 30% 40%, rgba(59,130,246,.18), transparent 55%)", pointerEvents: "none", animation: "donk_glow .45s ease-out both" }} />
              <div className="multTop">MULTIPLIER</div>
              <div key={multTextKey} className="multVal" style={{ position: "relative", animation: "donk_multPop .22s ease-out both" }}>
                {fmt(mult)}x
              </div>
              <div className="multHint">{canPlay ? "Your turn" : "Ready"}</div>
            </div>

            <div className="betArea">
              <div className="label">Bahis</div>
              <div className="betInputWrap">
                <img src={CURRENCY_SRC} alt="currency" />
                <input
                  value={betStr}
                  onChange={(e) => setBetStr(e.target.value.replace(/\D/g, ""))}
                  placeholder="0"
                  disabled={lockInputs}
                />
              </div>

              <div className="label" style={{ marginTop: 10 }}>
                Mayın
              </div>
              <div className="minesRow">
                {[3, 5, 10].map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={`miniBtn ${mines === m ? "on" : ""}`}
                    disabled={lockInputs}
                    tabIndex={-1}
                    onMouseDown={(e) => e.preventDefault()}
                    onPointerDown={(e) => e.preventDefault()}
                    onClick={() => setMines(m)}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="actions">
              <button className="btn primary" onClick={startRound} disabled={!canDeal || bet <= 0 || bet > coin} type="button" tabIndex={-1} onMouseDown={(e) => e.preventDefault()} onPointerDown={(e) => e.preventDefault()}>
                Start
              </button>

              <button className="btn sub" onClick={cashout} disabled={!canPlay || openedSafe <= 0} type="button" tabIndex={-1} onMouseDown={(e) => e.preventDefault()} onPointerDown={(e) => e.preventDefault()}>
                Cashout
              </button>

              <button className="btn danger" onClick={resetToIdle} disabled={phase === "playing"} type="button" tabIndex={-1} onMouseDown={(e) => e.preventDefault()} onPointerDown={(e) => e.preventDefault()}>
                Reset
              </button>
            </div>
          </div>

          <div className="gridWrap">
            <div className="grid">
              {tiles.map((st, i) => (
                <div key={i} style={{ height: cellH }}>
                  <Tile
                    state={st}
                    disabled={!canPlay || st !== "hidden" || busyCell !== null}
                    onClick={() => onTileClick(i)}
                    pulse={pulseIndex === i}
                    pressed={pressedIndex === i}
                    onPressStart={() => setPressedIndex(i)}
                    onPressEnd={() => setPressedIndex((cur) => (cur === i ? null : cur))}
                  />
                </div>
              ))}
            </div>
          </div>

          {resultBanner && (
            <div key={bannerKey} className={`result ${bannerTone}`}>
              {resultBanner}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

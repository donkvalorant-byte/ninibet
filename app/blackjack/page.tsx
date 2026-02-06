"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type Suit = "♠" | "♥" | "♦" | "♣";
type Face = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K";
type Card = { suit: Suit; face: Face; id: string };

const SUITS: Suit[] = ["♠", "♥", "♦", "♣"];
const FACES: Face[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const COIN_KEY = "donkgames_coin_v1";
const CURRENCY_SRC = "/currency.webp";

// ✅ sen 1.99s yaptın diye
const FLIP_MS = 1990;
const AFTER_FLIP_BUFFER_MS = 140;

let _id = 0;
function uid() {
  _id += 1;
  return String(_id);
}

const isRed = (s: Suit) => s === "♥" || s === "♦";
const cardPoints = (f: Face) => (f === "A" ? 11 : f === "J" || f === "Q" || f === "K" ? 10 : Number(f));

function handValue(h: Card[]) {
  let t = 0,
    a = 0;
  for (const c of h) {
    t += cardPoints(c.face);
    if (c.face === "A") a++;
  }
  while (t > 21 && a > 0) {
    t -= 10;
    a--;
  }
  return t;
}

function isBlackjack(h: Card[]) {
  return h.length === 2 && handValue(h) === 21;
}

function buildShoe(decks = 6): Card[] {
  const out: Card[] = [];
  for (let d = 0; d < decks; d++) {
    for (const s of SUITS) for (const f of FACES) out.push({ suit: s, face: f, id: uid() });
  }
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** ✅ Smooth flip: kart önce ters gelir, sonra delay ile açılır. */
function CardView({ card, hidden, delay }: { card: Card; hidden?: boolean; delay: number }) {
  const [faceUp, setFaceUp] = useState(false);

  useEffect(() => {
    let t: any;
    if (!hidden) {
      setFaceUp(false);
      t = setTimeout(() => setFaceUp(true), Math.max(0, delay));
    } else {
      setFaceUp(false);
    }
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let t: any;
    if (!hidden) {
      t = setTimeout(() => setFaceUp(true), 80);
    } else {
      setFaceUp(false);
    }
    return () => clearTimeout(t);
  }, [hidden]);

  return (
    <div className="card3d" style={{ animationDelay: `${delay}ms` }}>
      <div className={`cardInner ${faceUp && !hidden ? "faceUp" : "faceDown"}`} style={{ transitionDelay: `${Math.min(delay, 260)}ms` }}>
        <div className="cardFace cardFront">
          <div className={`corner ${isRed(card.suit) ? "red" : ""}`}>
            {card.face}
            {card.suit}
          </div>
          <div className={`suit ${isRed(card.suit) ? "red" : ""}`}>{card.suit}</div>
        </div>
        <div className="cardFace cardBack">
          <div className="backGrid" />
          <div className="backText">DONK</div>
        </div>
      </div>
    </div>
  );
}

function PixelBadge({ children }: { children: React.ReactNode }) {
  return <span className="pxBadge">{children}</span>;
}

type Phase = "idle" | "dealing" | "player" | "dealer" | "end";
type Outcome = "win" | "lose" | "push" | "bj" | "bust";

type PlayerHand = {
  cards: Card[];
  bet: number;
  outcome?: Outcome;
};

type HistoryItem = {
  id: string;
  label: string;
  net: number;
};

export default function Blackjack() {
  const [coin, setCoin] = useState(1000);
  const [betStr, setBetStr] = useState("50");

  const [dealer, setDealer] = useState<Card[]>([]);
  const [reveal, setReveal] = useState(false);

  const [hands, setHands] = useState<PlayerHand[]>([]);
  const [activeHand, setActiveHand] = useState(0);

  const [phase, setPhase] = useState<Phase>("idle");
  const [resultBanner, setResultBanner] = useState<string | null>(null);
  const [bannerKey, setBannerKey] = useState(0);

  const [insuranceBet, setInsuranceBet] = useState(0);
  const [insuranceTaken, setInsuranceTaken] = useState(false);

  const [history, setHistory] = useState<HistoryItem[]>([]);

  const shoeRef = useRef<Card[]>([]);
  const busy = useRef(false);

  const payoutAppliedRef = useRef(false);
  const insuranceAppliedRef = useRef(false);
  const historyAppliedRef = useRef(false);
  const settledRef = useRef(false);

  const timersRef = useRef<number[]>([]);
  function addTimer(id: number) {
    timersRef.current.push(id);
  }
  useEffect(() => {
    return () => {
      for (const id of timersRef.current) clearTimeout(id);
      timersRef.current = [];
    };
  }, []);

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

  function ensureShoe() {
    if (shoeRef.current.length < 60) shoeRef.current = buildShoe(6);
  }
  function draw(): Card {
    ensureShoe();
    const c = shoeRef.current.pop();
    if (!c) {
      shoeRef.current = buildShoe(6);
      return shoeRef.current.pop()!;
    }
    return c;
  }

  function resetRoundUI() {
    settledRef.current = false;
    payoutAppliedRef.current = false;
    insuranceAppliedRef.current = false;
    historyAppliedRef.current = false;

    setResultBanner(null);
    setBannerKey((k) => k + 1);
    setReveal(false);
    setInsuranceBet(0);
    setInsuranceTaken(false);
    setActiveHand(0);
  }

  function settleInsurance(dealerHasBJ: boolean) {
    if (!insuranceTaken || insuranceBet <= 0) return;
    if (insuranceAppliedRef.current) return;
    insuranceAppliedRef.current = true;

    if (dealerHasBJ) setCoin((c) => c + insuranceBet * 3);
  }

  function settleHand(h: PlayerHand, dealerFinal: Card[]) {
    const pv = handValue(h.cards);
    const dv = handValue(dealerFinal);

    if (pv > 21) return { outcome: "bust" as Outcome, delta: 0, label: "BUST" };

    if (isBlackjack(h.cards) && !isBlackjack(dealerFinal)) {
      const profit = Math.floor(h.bet * 1.5);
      return { outcome: "bj" as Outcome, delta: h.bet + profit, label: "BLACKJACK" };
    }

    if (dv > 21) return { outcome: "win" as Outcome, delta: h.bet * 2, label: "WIN" };
    if (pv > dv) return { outcome: "win" as Outcome, delta: h.bet * 2, label: "WIN" };
    if (pv < dv) return { outcome: "lose" as Outcome, delta: 0, label: "LOSE" };

    return { outcome: "push" as Outcome, delta: h.bet, label: "PUSH" };
  }

  function deal() {
    if (busy.current) return;
    if (bet <= 0 || bet > coin) return;

    busy.current = true;
    resetRoundUI();
    setPhase("dealing");

    setCoin((c) => c - bet);

    const p1 = draw();
    const d1 = draw();
    const p2 = draw();
    const d2 = draw();

    setHands([{ cards: [], bet }]);
    setDealer([]);
    setReveal(false);

    addTimer(window.setTimeout(() => setHands([{ cards: [p1], bet }]), 120));
    addTimer(window.setTimeout(() => setDealer([d1]), 260));
    addTimer(window.setTimeout(() => setHands([{ cards: [p1, p2], bet }]), 380));
    addTimer(window.setTimeout(() => setDealer([d1, d2]), 560));

    addTimer(
      window.setTimeout(() => {
        setPhase("player");
        busy.current = false;

        const playerBJ = isBlackjack([p1, p2]);
        const dealerBJ = isBlackjack([d1, d2]);
        if (playerBJ || dealerBJ) addTimer(window.setTimeout(() => endRoundAutoReveal(), 450));
      }, 620)
    );
  }

  function endRoundAutoReveal() {
    if (settledRef.current) return;
    settledRef.current = true;

    setPhase("dealer");
    setReveal(true);

    let d = [...dealer];
    if (!isBlackjack(d)) {
      while (handValue(d) < 17) d.push(draw());
    }
    setDealer(d);

    const dealerHasBJ = isBlackjack(d);
    settleInsurance(dealerHasBJ);

    setHands((prev) => {
      let totalBack = 0;
      const labels: string[] = [];

      const next = prev.map((h, idx) => {
        const { outcome, delta, label } = settleHand(h, d);
        totalBack += delta;
        labels.push(prev.length > 1 ? `H${idx + 1}:${label}` : label);
        return { ...h, outcome };
      });

      if (totalBack > 0 && !payoutAppliedRef.current) {
        payoutAppliedRef.current = true;
        setCoin((c) => c + totalBack);
      }

      const totalStaked = next.reduce((sum, h) => sum + h.bet, 0);
      const insuranceNet = insuranceTaken ? (dealerHasBJ ? insuranceBet * 2 : -insuranceBet) : 0;
      const net = -totalStaked + totalBack + insuranceNet;

      const outcomes = next.map((h) => h.outcome);
      const labelPick =
        outcomes.includes("bj")
          ? "BLACKJACK"
          : outcomes.includes("win")
          ? "WIN"
          : outcomes.includes("push")
          ? "PUSH"
          : outcomes.includes("lose")
          ? "LOSE"
          : "BUST";

      const bannerParts = [...labels];
      if (insuranceTaken) bannerParts.push(dealerHasBJ ? "INSURANCE WIN" : "INSURANCE LOSE");
      const banner = bannerParts.join(" • ");

      const showDelay = FLIP_MS + AFTER_FLIP_BUFFER_MS;

      addTimer(
        window.setTimeout(() => {
          setResultBanner(banner);
          setBannerKey((k) => k + 1);

          if (!historyAppliedRef.current) {
            historyAppliedRef.current = true;
            setHistory((prevH) => [{ id: uid(), label: labelPick, net }, ...prevH].slice(0, 5));
          }
        }, showDelay)
      );

      setPhase("end");
      return next;
    });
  }

  function currentHand() {
    return hands[activeHand];
  }

  function canHit() {
    return phase === "player" && !!hands.length && handValue(currentHand().cards) < 21;
  }
  function canStand() {
    return phase === "player" && !!hands.length;
  }
  function canDouble() {
    if (phase !== "player") return false;
    const h = currentHand();
    if (!h) return false;
    if (h.cards.length !== 2) return false;
    if (coin < h.bet) return false;
    return true;
  }
  function canSplit() {
    if (phase !== "player") return false;
    if (hands.length !== 1) return false;
    const h = hands[0];
    if (!h || h.cards.length !== 2) return false;
    if (coin < h.bet) return false;
    return h.cards[0].face === h.cards[1].face;
  }
  function canInsurance() {
    if (phase !== "player") return false;
    if (!dealer[0]) return false;
    if (reveal) return false;
    if (insuranceTaken) return false;
    if (dealer[0].face !== "A") return false;
    const base = hands[0]?.bet ?? bet;
    const ins = Math.floor(base / 2);
    if (ins <= 0) return false;
    return coin >= ins;
  }

  function hit() {
    if (!canHit()) return;
    const idx = activeHand;

    setHands((prev) => {
      const next = [...prev];
      const h = next[idx];
      next[idx] = { ...h, cards: [...h.cards, draw()] };
      return next;
    });

    addTimer(
      window.setTimeout(() => {
        setHands((prev) => {
          const hh = prev[activeHand];
          if (!hh) return prev;
          if (handValue(hh.cards) <= 21) return prev;

          const next = [...prev];
          next[activeHand] = { ...hh, outcome: "bust" };

          const nextIndex = activeHand + 1;
          if (nextIndex < next.length) setActiveHand(nextIndex);
          else addTimer(window.setTimeout(() => endRoundAutoReveal(), 350));

          return next;
        });
      }, 0)
    );
  }

  function stand() {
    if (!canStand()) return;
    const nextIndex = activeHand + 1;
    if (nextIndex < hands.length) {
      setActiveHand(nextIndex);
      return;
    }
    endRoundAutoReveal();
  }

  function doubleDown() {
    if (!canDouble()) return;

    const idx = activeHand;
    const extra = hands[idx].bet;

    setCoin((c) => c - extra);

    setHands((prev) => {
      const next = [...prev];
      const h = next[idx];
      next[idx] = { ...h, bet: h.bet * 2, cards: [...h.cards, draw()] };
      return next;
    });

    addTimer(
      window.setTimeout(() => {
        const nextIndex = idx + 1;
        if (nextIndex < hands.length) setActiveHand(nextIndex);
        else endRoundAutoReveal();
      }, 250)
    );
  }

  function split() {
    if (!canSplit()) return;

    const baseBet = hands[0].bet;
    setCoin((c) => c - baseBet);

    const c1 = hands[0].cards[0];
    const c2 = hands[0].cards[1];

    const h1: PlayerHand = { cards: [c1, draw()], bet: baseBet };
    const h2: PlayerHand = { cards: [c2, draw()], bet: baseBet };

    setHands([h1, h2]);
    setActiveHand(0);
  }

  function takeInsurance() {
    if (!canInsurance()) return;
    const base = hands[0]?.bet ?? bet;
    const ins = Math.floor(base / 2);

    setInsuranceTaken(true);
    setInsuranceBet(ins);
    setCoin((c) => c - ins);

    const dealerHasBJ = isBlackjack(dealer);
    if (dealerHasBJ) addTimer(window.setTimeout(() => endRoundAutoReveal(), 250));
  }

  const canDeal = phase === "idle" || phase === "end";
  const canPlay = phase === "player";

  const bannerTone =
    resultBanner?.includes("LOSE") || resultBanner?.includes("BUST")
      ? "lose"
      : resultBanner?.includes("PUSH")
      ? "push"
      : resultBanner
      ? "win"
      : "";

  // ✅ oyun bitti + banner geldi = artık sonuçları gösterebilirsin
  const showFinalBadges = phase === "end" && !!resultBanner;

  return (
    <main className="page">
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
                history.map((h, i) => (
                  <span key={h.id} className={`hItem ${h.label.toLowerCase()}`} style={{ animationDelay: `${i * 70}ms` }}>
                    <span className="hLabel">{h.label}</span>
                    <span className={`hNet ${h.net >= 0 ? "pos" : "neg"}`}>
                      {h.net >= 0 ? "+" : ""}
                      {h.net}
                    </span>
                  </span>
                ))
              )}
            </div>

            <div className="coinBox">
              <img src={CURRENCY_SRC} alt="currency" />
              <b>{coin}</b>
            </div>
          </header>

          <div className="row">
            <div className={`dealerAvatar ${bannerTone}`}>
              <img src="/dealer.webp" alt="dealer" />
            </div>

            <div className="betArea">
              <div className="label">Bahis</div>
              <div className="betInputWrap">
                <img src={CURRENCY_SRC} alt="currency" />
                <input
                  value={betStr}
                  onChange={(e) => {
                    const v = e.target.value;
                    let out = "";
                    for (let i = 0; i < v.length; i++) {
                      const ch = v[i];
                      if (ch >= "0" && ch <= "9") out += ch;
                    }
                    setBetStr(out);
                  }}
                  placeholder="0"
                  disabled={!canDeal}
                />
              </div>

              {canPlay && dealer[0]?.face === "A" && !reveal && (
                <div className="insNote">
                  Dealer A gösteriyor {insuranceTaken ? `(Insurance alındı: ${insuranceBet})` : `(Insurance mümkün)`}
                </div>
              )}
            </div>

            <div className="actions">
              <button className="btn primary" onClick={deal} disabled={!canDeal} type="button">
                Deal
              </button>

              <button className="btn hit" onClick={hit} disabled={!canPlay || !canHit()} type="button">
                <PixelBadge>🃏</PixelBadge>
                <PixelBadge>＋</PixelBadge>
                Hit
              </button>

              <button className="btn stand" onClick={stand} disabled={!canPlay || !canStand()} type="button">
                <PixelBadge>🃏</PixelBadge>
                <PixelBadge>✋</PixelBadge>
                Stand
              </button>

              <button className="btn sub" onClick={doubleDown} disabled={!canPlay || !canDouble()} type="button">
                <PixelBadge>×2</PixelBadge>
                Double
              </button>

              {canPlay && canSplit() && (
                <button className="btn sub" onClick={split} type="button">
                  <PixelBadge>⇄</PixelBadge>
                  Split
                </button>
              )}

              {canPlay && canInsurance() && (
                <button className="btn sub" onClick={takeInsurance} type="button">
                  <PixelBadge>🛡️</PixelBadge>
                  Insurance
                </button>
              )}
            </div>
          </div>

          {/* PLAYER */}
          <div className="hand">
            <div className="handTitle">You</div>

            <div className="splitWrap">
              {hands.map((h, hi) => {
                const v = handValue(h.cards);
                const active = hi === activeHand && phase === "player";
                const busted = h.outcome === "bust";

                // ✅ oyun bitmeden WIN/LOSE/PUSH/BJ göstermiyoruz
                const showOutcomeNow = h.outcome === "bust" || (showFinalBadges && !!h.outcome);

                return (
                  <div key={hi} className={`handBox ${active ? "active" : ""} ${busted ? "busted" : ""} ${h.outcome ? "done" : ""}`}>
                    <div className="handMeta">
                      <div className="handMetaLeft">
                        <b>{hands.length > 1 ? `Hand ${hi + 1}` : "Hand"}</b>

                        <span className="chip">
                          Bet: <img src={CURRENCY_SRC} alt="currency" /> {h.bet}
                        </span>
                      </div>

                      <div className="handMetaRight">
                        {showOutcomeNow ? (
                          <span className={`pill ${h.outcome}`}>{h.outcome!.toUpperCase()}</span>
                        ) : active ? (
                          <span className="pill turn">YOUR TURN</span>
                        ) : null}
                      </div>
                    </div>

                    <div className="scoreBar">
                      <span className={`scorePill ${active ? "active" : ""}`}>SCORE: {v}</span>
                    </div>

                    <div className="cards">
                      {h.cards.map((c, i) => (
                        <CardView key={c.id} card={c} delay={i * 120} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* DEALER */}
          <div className="hand">
            <div className="handTitle">
              Dealer{" "}
              <span className="miniScore">
                {reveal ? `(${handValue(dealer)})` : dealer.length ? `(${cardPoints(dealer[0].face)} + ?)` : ""}
              </span>
            </div>
            <div className="cards">
              {dealer.map((c, i) => (
                <CardView key={c.id} card={c} hidden={!reveal && i === 1} delay={i * 120} />
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
          min-width:110px;justify-content:flex-end;
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
          animation:histIn .28s ease-out both;
        }
        @keyframes histIn{from{opacity:0;transform:translateY(8px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}
        .hLabel{font-size:12px;letter-spacing:.02em}
        .hNet{font-size:12px;padding:4px 8px;border-radius:999px;border:1px solid rgba(255,255,255,.12);background:rgba(0,0,0,.18)}
        .hNet.pos{color:rgba(34,197,94,.95);border-color:rgba(34,197,94,.35)}
        .hNet.neg{color:rgba(239,68,68,.95);border-color:rgba(239,68,68,.35)}
        .hItem.win,.hItem.blackjack{border-color:rgba(34,197,94,.25)}
        .hItem.lose,.hItem.bust{border-color:rgba(239,68,68,.25)}
        .hItem.push{border-color:rgba(59,130,246,.25)}

        .row{
          position:relative;display:grid;
          grid-template-columns:auto 1fr auto;
          gap:14px;align-items:center;padding:8px;
        }
        @media (max-width:920px){
          .row{grid-template-columns:1fr}
          .historyBar{order:2}
          .coinBox{justify-content:center}
          .actions{justify-content:center}
        }

        .dealerAvatar{
          width:74px;height:74px;border-radius:22px;
          border:1px solid rgba(255,255,255,.12);
          background:rgba(0,0,0,.25);
          overflow:hidden;display:grid;place-items:center;
          box-shadow:0 0 35px rgba(59,130,246,.18);
          transition:box-shadow .25s ease, transform .25s ease;
        }
        .dealerAvatar img{width:64px;height:64px;image-rendering:pixelated}
        .dealerAvatar.win{box-shadow:0 0 65px rgba(34,197,94,.22);transform:translateY(-1px)}
        .dealerAvatar.lose{box-shadow:0 0 65px rgba(239,68,68,.22);transform:translateY(-1px)}
        .dealerAvatar.push{box-shadow:0 0 65px rgba(59,130,246,.18);transform:translateY(-1px)}

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
        .insNote{margin-top:8px;font-size:12px;color:rgba(255,255,255,.7)}

        .actions{display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap}

        .btn{
          border:1px solid rgba(255,255,255,.10);
          background:rgba(255,255,255,.06);
          color:white;
          padding:12px 16px;border-radius:18px;
          font-weight:1000;
          transition:transform .15s ease, filter .15s ease;
          display:flex;align-items:center;gap:10px;
        }
        .btn:hover{transform:translateY(-1px);filter:brightness(1.05)}
        .btn:disabled{opacity:.45;cursor:not-allowed;transform:none}
        .btn.primary{background:white;color:#0a0a12}
        .btn.hit{background:rgba(34,197,94,.95);color:#07140c;box-shadow:0 0 40px rgba(34,197,94,.18)}
        .btn.stand{background:rgba(239,68,68,.95);color:#140707;box-shadow:0 0 40px rgba(239,68,68,.18)}
        .btn.sub{background:rgba(34,197,94,.14);border:1px solid rgba(34,197,94,.35);color:rgba(255,255,255,.92)}
        .btn.sub:hover{filter:brightness(1.08)}

        .pxBadge{
          width:28px;height:28px;display:grid;place-items:center;
          border-radius:10px;border:1px solid rgba(255,255,255,.18);
          background:rgba(0,0,0,.18);
          box-shadow:inset 0 0 0 1px rgba(0,0,0,.18);
          font-size:16px;line-height:1;
        }

        .hand{position:relative;padding:12px 8px 6px}
        .handTitle{text-align:center;font-size:12px;font-weight:1000;color:rgba(255,255,255,.70);margin-bottom:8px}
        .miniScore{opacity:.8;margin-left:6px}
        .splitWrap{display:flex;flex-direction:column;gap:12px}

        .handBox{
          border:1px solid rgba(255,255,255,.10);
          background:rgba(0,0,0,.18);
          border-radius:22px;padding:10px;position:relative;
          transition:border-color .25s ease, box-shadow .25s ease, transform .25s ease;
        }
        .handBox.active{
          border-color:rgba(239,68,68,.55);
          box-shadow:0 0 70px rgba(239,68,68,.12);
          animation:breatheRed 1.8s ease-in-out infinite;
        }
        @keyframes breatheRed{
          0%,100%{box-shadow:0 0 70px rgba(239,68,68,.10)}
          50%{box-shadow:0 0 95px rgba(239,68,68,.18)}
        }
        .handBox.busted{animation:shake .28s ease-in-out 1;border-color:rgba(239,68,68,.65)}
        @keyframes shake{
          0%{transform:translateX(0)}
          25%{transform:translateX(-4px)}
          50%{transform:translateX(4px)}
          75%{transform:translateX(-3px)}
          100%{transform:translateX(0)}
        }

        .handMeta{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:6px 6px 10px}
        .handMetaLeft{display:flex;align-items:center;gap:10px;flex-wrap:wrap}

        .chip{
          display:flex;align-items:center;gap:8px;
          font-size:14px;padding:8px 12px;border-radius:999px;
          border:1px solid rgba(255,255,255,.14);
          background:rgba(255,255,255,.08);
          color:rgba(255,255,255,.90);
          font-weight:1000;
        }
        .chip img{width:16px;height:16px;image-rendering:pixelated}

        .pill{
          font-size:12px;padding:6px 10px;border-radius:999px;font-weight:1000;
          border:1px solid rgba(255,255,255,.12);
          background:rgba(0,0,0,.22);
          color:rgba(255,255,255,.82);
        }
        .pill.turn{
          border-color:rgba(239,68,68,.80);
          color:rgba(239,68,68,.98);
          background:rgba(239,68,68,.12);
          box-shadow:0 0 0 2px rgba(239,68,68,.28), 0 0 35px rgba(239,68,68,.18);
        }
        .pill.bust,.pill.lose{border-color:rgba(239,68,68,.35);color:rgba(239,68,68,.95)}
        .pill.win,.pill.bj{border-color:rgba(34,197,94,.35);color:rgba(34,197,94,.95)}
        .pill.push{border-color:rgba(59,130,246,.35);color:rgba(59,130,246,.95)}

        .scoreBar{display:flex;justify-content:center;margin:2px 0 10px}
        .scorePill{
          font-size:18px;font-weight:1000;
          padding:10px 16px;border-radius:999px;
          border:1px solid rgba(255,255,255,.18);
          background:rgba(0,0,0,.28);
          color:rgba(255,255,255,.95);
          letter-spacing:.06em;
          box-shadow:0 0 35px rgba(255,255,255,.06);
        }
        .scorePill.active{
          border-color:rgba(239,68,68,.80);
          color:rgba(239,68,68,.98);
          background:rgba(239,68,68,.12);
          box-shadow:0 0 0 2px rgba(239,68,68,.28), 0 0 45px rgba(239,68,68,.18);
        }

        .cards{display:flex;gap:10px;flex-wrap:wrap;min-height:126px;justify-content:center}

        .card3d{
          width:86px;height:124px;
          perspective:1200px;
          animation:dealIn .42s cubic-bezier(0.18,0.92,0.22,1) both;
        }
        @keyframes dealIn{
          0%{opacity:0;transform:translateY(22px) translateX(-10px) scale(.94) rotateX(10deg) rotateZ(-2deg)}
          70%{opacity:1;transform:translateY(-2px) translateX(0) scale(1.02) rotateX(0) rotateZ(0)}
          100%{opacity:1;transform:translateY(0) translateX(0) scale(1) rotateX(0) rotateZ(0)}
        }

        .cardInner{
          width:100%;height:100%;
          position:relative;
          transform-style:preserve-3d;
          transition: transform 1.99s cubic-bezier(.2,.9,.15,1);
          will-change: transform;
        }
        .cardInner.faceDown{transform: rotateY(180deg)}
        .cardInner.faceUp{transform: rotateY(0deg)}

        .cardFace{position:absolute;inset:0;border-radius:18px;overflow:hidden;backface-visibility:hidden}
        .cardFront{background:white;border:1px solid rgba(0,0,0,.08)}
        .corner{position:absolute;top:10px;left:10px;font-weight:1000;font-size:14px;color:#111827}
        .corner.red{color:#dc2626}
        .suit{height:100%;display:grid;place-items:center;font-size:54px;font-weight:1000;color:#111827}
        .suit.red{color:#dc2626}
        .cardBack{
          transform: rotateY(180deg);
          background: linear-gradient(135deg, rgba(255,0,80,0.30), rgba(0,180,255,0.22));
          border: 1px solid rgba(255,255,255,.14);
          display:grid;place-items:center;
          font-weight:1000;letter-spacing:.2em;
        }
        .backGrid{
          position:absolute;inset:0;opacity:.30;
          background:
            linear-gradient(to right, rgba(255,255,255,0.10) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.10) 1px, transparent 1px);
          background-size: 10px 10px;
        }
        .backText{position:relative;color:rgba(255,255,255,.85);font-size:12px}

        .result{
          margin:10px 8px 4px;border-radius:24px;
          border:1px solid rgba(255,255,255,.12);
          background:rgba(0,0,0,.30);
          padding:16px 18px;text-align:center;
          font-weight:1000;font-size:26px;letter-spacing:.06em;
          animation: pop .26s ease-out both;
        }
        @keyframes pop{from{transform:translateY(12px) scale(.96);opacity:.6}to{transform:translateY(0) scale(1);opacity:1}}
        .result.win{color:#22c55e;text-shadow:0 0 35px rgba(34,197,94,.45)}
        .result.lose{color:#ef4444;text-shadow:0 0 35px rgba(239,68,68,.45)}
        .result.push{color:#3b82f6;text-shadow:0 0 35px rgba(59,130,246,.35)}
      `}</style>
    </main>
  );
}

"use client";

import { useState } from "react";

export default function AdminPage() {
  const [adminSecret, setSecret] = useState("");
  const [username, setUser] = useState("");
  const [amount, setAmount] = useState("1000");
  const [msg, setMsg] = useState("");

  async function grant() {
    setMsg("");
    const r = await fetch("/api/admin/grant", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        adminSecret,
        username,
        amount: Number(amount),
      }),
    });

    const j = await r.json();
    if (!j.ok) return setMsg(j.error || "Hata");
    setMsg(`✅ ${j.user.username} yeni coin: ${j.user.coin}`);
  }

  return (
    <main className="min-h-screen text-white grid place-items-center bg-zinc-950">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6">
        <h1 className="text-2xl font-extrabold">Admin Panel</h1>
        <p className="mt-2 text-white/70 text-sm">Arkadaşlara bakiye bas.</p>

        <input
          className="mt-4 w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 outline-none"
          placeholder="ADMIN_SECRET"
          type="password"
          value={adminSecret}
          onChange={(e) => setSecret(e.target.value)}
        />

        <div className="mt-3 grid grid-cols-2 gap-3">
          <input
            className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 outline-none"
            placeholder="username"
            value={username}
            onChange={(e) => setUser(e.target.value)}
          />
          <input
            className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 outline-none"
            placeholder="amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <button
          onClick={grant}
          className="mt-4 w-full rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 px-4 py-3 font-bold"
        >
          Bakiye Bas
        </button>

        {msg && <div className="mt-3 text-sm text-white/80">{msg}</div>}

        <a className="mt-4 block text-xs text-white/60 hover:text-white" href="/">
          ← Ana sayfa
        </a>
      </div>
    </main>
  );
}

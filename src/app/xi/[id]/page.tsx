"use client";

import Link from "next/link";
import { use, useMemo, useState } from "react";
import { formatINR } from "@/lib/money";
import { scoreSquad } from "@/engine/scoring";
import { PageStatus, useAuctionData } from "@/hooks/useAuctionData";

const XI_MAX_OVERSEAS = 4;

const SLOTS = [
  { key: "open1", label: "Opening batter" },
  { key: "open2", label: "Opening batter" },
  { key: "three", label: "No. 3" },
  { key: "four", label: "No. 4" },
  { key: "five", label: "No. 5" },
  { key: "ar1", label: "All-rounder" },
  { key: "ar2", label: "All-rounder" },
  { key: "wk", label: "Wicketkeeper" },
  { key: "fast1", label: "Fast bowler" },
  { key: "fast2", label: "Fast bowler" },
  { key: "spin", label: "Spinner" },
];

export default function XiPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, error } = useAuctionData(id);
  const [edits, setEdits] = useState<Record<string, string> | null>(null);
  const [msg, setMsg] = useState("");

  const saved = useMemo(() => {
    const mapped: Record<string, string> = {};
    for (const s of data?.playingXi ?? []) if (s.playerId) mapped[s.slotKey] = s.playerId;
    return mapped;
  }, [data]);
  const xi = edits ?? saved;

  const members = useMemo(() => data?.userTeam?.members ?? [], [data]);
  const score = useMemo(() => {
    if (!members.length) return null;
    return scoreSquad(members.map((m) => ({ ...m.player, price: m.price })));
  }, [members]);

  const picked = Object.values(xi).filter(Boolean);
  const overseasPicked = members.filter((m) => picked.includes(m.playerId) && m.player.isOverseas).length;

  async function save() {
    if (overseasPicked > XI_MAX_OVERSEAS) {
      setMsg(`A playing XI can include at most ${XI_MAX_OVERSEAS} overseas players.`);
      return;
    }
    const slots = SLOTS.map((s, i) => ({ slotKey: s.key, playerId: xi[s.key] || null, orderIndex: i }));
    const res = await fetch(`/api/auction/${id}/xi`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slots }),
    });
    const json = await res.json().catch(() => null);
    setMsg(res.ok ? "Playing XI saved." : json?.error ?? "Could not save XI.");
  }

  if (!data) return <PageStatus label="Loading XI builder..." error={error} />;

  return (
    <main className="mx-auto max-w-5xl px-5 py-8">
      <Link href={`/auction/${id}`} className="text-sm gold">
        ← Room
      </Link>
      <h1 className="display mt-3 text-5xl">Playing XI</h1>
      {score && (
        <div className="glass mt-5 grid grid-cols-2 gap-2 rounded-2xl p-4 md:grid-cols-5">
          <Score n={score.overall} l="Overall" />
          <Score n={score.batting} l="Batting" />
          <Score n={score.bowling} l="Bowling" />
          <Score n={score.balance} l="Balance" />
          <Score n={score.value} l="Value" />
        </div>
      )}
      <p className="mt-4 text-sm text-white/55">
        {picked.length}/11 selected · overseas {overseasPicked}/{XI_MAX_OVERSEAS}
      </p>
      <div className="mt-6 space-y-2">
        {SLOTS.map((s) => (
          <label key={s.key} className="grid grid-cols-[160px_1fr] items-center gap-3 text-sm">
            <span className="uppercase tracking-widest text-white/45">{s.label}</span>
            <select className="field" value={xi[s.key] ?? ""} onChange={(e) => setEdits({ ...xi, [s.key]: e.target.value })}>
              <option value="">—</option>
              {members.map((m) => (
                <option key={m.playerId} value={m.playerId} disabled={picked.includes(m.playerId) && xi[s.key] !== m.playerId}>
                  {m.player.name} · {m.player.role} · {formatINR(m.price)}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <button onClick={save} className="mt-6 rounded-full bg-[var(--gold)] px-6 py-3 font-semibold text-black">
        Save XI
      </button>
      {msg && <p className="mt-3 text-sm text-white/60">{msg}</p>}
    </main>
  );
}

function Score({ n, l }: { n: number; l: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-white/40">{l}</p>
      <p className="display text-3xl">{n}</p>
    </div>
  );
}

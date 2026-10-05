"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatINR } from "@/lib/money";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

type PlayerRow = {
  id: string;
  name: string;
  country: string;
  role: string;
  capped: boolean;
  age: number | null;
  megaBasePrice: number;
  actual2026Price: number | null;
  runs: number | null;
  battingAvg: number | null;
  strikeRate: number | null;
  wickets: number | null;
  economy: number | null;
  ratings: { overall: number };
};

function PlayersInner() {
  const sp = useSearchParams();
  const sessionId = sp.get("sessionId") ?? "";
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [overseas, setOverseas] = useState("");
  const [capped, setCapped] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("rating");
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [compare, setCompare] = useState<string[]>([]);

  useEffect(() => {
    const u = new URLSearchParams();
    if (q) u.set("search", q);
    if (role) u.set("role", role);
    if (overseas) u.set("overseas", overseas);
    if (capped) u.set("capped", capped);
    if (sessionId) u.set("sessionId", sessionId);
    if (sessionId && status) u.set("status", status);
    fetch(`/api/players?${u}`)
      .then((r) => r.json())
      .then((j) => setPlayers(j.players ?? []));
  }, [q, role, overseas, capped, status, sessionId]);

  const sorted = useMemo(() => {
    const arr = [...players];
    arr.sort((a, b) => {
      switch (sort) {
        case "rating":
          return (b.ratings?.overall ?? 0) - (a.ratings?.overall ?? 0);
        case "rating-low":
          return (a.ratings?.overall ?? 0) - (b.ratings?.overall ?? 0);
        case "base":
          return b.megaBasePrice - a.megaBasePrice;
        case "base-low":
          return a.megaBasePrice - b.megaBasePrice;
        case "sr":
          return (b.strikeRate ?? -1) - (a.strikeRate ?? -1);
        case "wkts":
          return (b.wickets ?? -1) - (a.wickets ?? -1);
        case "young":
          return (a.age ?? 99) - (b.age ?? 99);
        case "old":
          return (b.age ?? 0) - (a.age ?? 0);
        default:
          return a.name.localeCompare(b.name);
      }
    });
    return arr;
  }, [players, sort]);

  const pair = sorted.filter((p) => compare.includes(p.id)).slice(0, 2);

  return (
    <main className="mx-auto max-w-6xl px-5 py-8">
      <h1 className="display text-5xl">Player database</h1>
      <p className="mt-2 text-sm text-white/50">2026 stats appear only where verified. Ratings are game-generated.</p>
      <div className="mt-6 grid gap-2 md:grid-cols-6">
        <input className="field md:col-span-2" placeholder="Search player" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="field" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">Role</option>
          <option value="BATTER">Batter</option>
          <option value="BOWLER">Bowler</option>
          <option value="ALL_ROUNDER">All-rounder</option>
          <option value="WICKETKEEPER">Wicketkeeper</option>
        </select>
        <select className="field" value={overseas} onChange={(e) => setOverseas(e.target.value)}>
          <option value="">Indian / overseas</option>
          <option value="no">Indian</option>
          <option value="yes">Overseas</option>
        </select>
        <select className="field" value={capped} onChange={(e) => setCapped(e.target.value)}>
          <option value="">Capped / uncapped</option>
          <option value="yes">Capped</option>
          <option value="no">Uncapped</option>
        </select>
        {sessionId && (
          <select className="field" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Any auction status</option>
            <option value="PENDING">Upcoming</option>
            <option value="LIVE">On the block</option>
            <option value="SOLD">Sold</option>
            <option value="UNSOLD">Unsold</option>
          </select>
        )}
        <select className="field" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="rating">Highest rating</option>
          <option value="rating-low">Lowest rating</option>
          <option value="base">Highest base</option>
          <option value="base-low">Lowest base</option>
          <option value="sr">Highest strike rate</option>
          <option value="wkts">Most wickets</option>
          <option value="young">Youngest</option>
          <option value="old">Oldest</option>
        </select>
      </div>
      {pair.length === 2 && (
        <div className="glass mt-6 grid gap-4 rounded-2xl p-4 md:grid-cols-2">
          {pair.map((p) => (
            <div key={p.id}>
              <h2 className="display text-3xl">{p.name}</h2>
              <p>Runs {p.runs ?? "Unknown"}</p>
              <p>Average {p.battingAvg ?? "Unknown"}</p>
              <p>Strike rate {p.strikeRate ?? "Unknown"}</p>
              <p>Wickets {p.wickets ?? "Unknown"}</p>
              <p>Economy {p.economy ?? "Unknown"}</p>
              <p>Age {p.age ?? "Unknown"}</p>
              <p>Game rating {p.ratings.overall}</p>
              <p>Base {formatINR(p.megaBasePrice)}</p>
            </div>
          ))}
        </div>
      )}
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-[11px] uppercase tracking-widest text-white/40">
            <tr>
              <th className="py-2">Player</th>
              <th>Role</th>
              <th>Base</th>
              <th>2026 sold</th>
              <th>Runs</th>
              <th>Wkts</th>
              <th>Game rating</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => (
              <tr key={p.id} className="border-t border-white/10">
                <td className="py-2">
                  {p.name}
                  <div className="text-[11px] text-white/40">
                    {p.country} · {p.capped ? "Capped" : "Uncapped"}
                  </div>
                </td>
                <td>{p.role}</td>
                <td>{formatINR(p.megaBasePrice)}</td>
                <td>{p.actual2026Price ? formatINR(p.actual2026Price) : "—"}</td>
                <td>{p.runs ?? "—"}</td>
                <td>{p.wickets ?? "—"}</td>
                <td>{p.ratings.overall}</td>
                <td>
                  <button
                    className="text-xs gold"
                    onClick={() =>
                      setCompare((c) => (c.includes(p.id) ? c.filter((x) => x !== p.id) : [...c.slice(-1), p.id]))
                    }
                  >
                    Compare
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Link href="/" className="mt-6 inline-block text-sm gold">
        Home
      </Link>
    </main>
  );
}

export default function PlayersPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading players...</div>}>
      <PlayersInner />
    </Suspense>
  );
}

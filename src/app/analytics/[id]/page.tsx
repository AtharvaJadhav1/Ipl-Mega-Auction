"use client";

import Link from "next/link";
import { use, useMemo } from "react";
import { formatINR } from "@/lib/money";
import { whatIfStoppedAt } from "@/engine/scoring";
import { PageStatus, useAuctionData } from "@/hooks/useAuctionData";

export default function AnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, error } = useAuctionData(id);
  const stats = useMemo(() => {
    if (!data) return null;
    const sold = data.lots.filter((l) => l.status === "SOLD");
    const unsold = data.lots.filter((l) => l.status === "UNSOLD");
    const spend = sold.reduce((s, l) => s + (l.soldPrice ?? 0), 0);
    const byTeam = data.teams.map((t) => ({
      name: t.franchise.shortName,
      spent: t.initialPurse - t.purse,
      remaining: t.purse,
      players: t.members.length,
    }));
    const highest = [...sold].sort((a, b) => (b.soldPrice ?? 0) - (a.soldPrice ?? 0))[0];
    const userBuys = data.userTeam.members.filter((m) => m.price > 0);
    const whatIfs = userBuys.slice(0, 3).map((m) =>
      whatIfStoppedAt(m.player.name, m.price, Math.max(m.player.megaBasePrice, Math.round(m.price * 0.7)), m.player.actual2026Price),
    );
    const roleSpend: Record<string, number> = {};
    let overseasSpend = 0;
    let indianSpend = 0;
    for (const t of data.teams) {
      for (const m of t.members) {
        if (!m.price) continue;
        roleSpend[m.player.role] = (roleSpend[m.player.role] ?? 0) + m.price;
        if (m.player.isOverseas) overseasSpend += m.price;
        else indianSpend += m.price;
      }
    }
    return { sold, unsold, spend, byTeam, highest, whatIfs, roleSpend, overseasSpend, indianSpend };
  }, [data]);
  if (!data || !stats) return <PageStatus label="Loading analytics..." error={error} />;
  return (
    <main className="mx-auto max-w-6xl px-5 py-8">
      <Link href={`/auction/${id}`} className="text-sm gold">
        ← Room
      </Link>
      <h1 className="display mt-3 text-5xl">Auction analytics</h1>
      <div className="mt-6 grid gap-3 md:grid-cols-4">
        <Tile label="Players purchased" value={String(stats.sold.length)} />
        <Tile label="Unsold lots" value={String(stats.unsold.length)} />
        <Tile label="Total spend" value={formatINR(stats.spend)} />
        <Tile label="Average price" value={stats.sold.length ? formatINR(Math.round(stats.spend / stats.sold.length)) : "—"} />
      </div>
      <p className="mt-6 text-[11px] uppercase tracking-widest text-white/40">Remaining purse</p>
      <div className="mt-2 space-y-2">
        {stats.byTeam.map((t) => (
          <div key={t.name}>
            <div className="flex justify-between text-sm">
              <span>{t.name}</span>
              <span>
                {formatINR(t.spent)} spent · {formatINR(t.remaining)} left
              </span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full bg-[var(--gold)]"
                style={{ width: `${Math.min(100, (t.spent / Math.max(1, t.spent + t.remaining)) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-8 grid gap-3 md:grid-cols-2">
        <Tile label="Highest purchase" value={stats.highest ? `${stats.highest.player.name} · ${formatINR(stats.highest.soldPrice ?? 0)}` : "—"} />
        <Tile label="Indian vs overseas spend" value={`${formatINR(stats.indianSpend)} / ${formatINR(stats.overseasSpend)}`} />
      </div>
      <div className="mt-8">
        <p className="text-[11px] uppercase tracking-widest text-white/40">What if?</p>
        {stats.whatIfs.map((w) => (
          <div key={w.title} className="glass mt-2 rounded-xl p-4">
            <p className="font-semibold">{w.title}</p>
            <p className="mt-1 text-sm text-white/60">{w.detail}</p>
          </div>
        ))}
      </div>
    </main>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-xl p-4">
      <p className="text-[10px] uppercase tracking-widest text-white/40">{label}</p>
      <p className="mt-1">{value}</p>
    </div>
  );
}

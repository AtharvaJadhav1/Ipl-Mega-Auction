"use client";

import Link from "next/link";
import { use, useMemo } from "react";
import { formatINR } from "@/lib/money";
import { bestAndWorst, scoreSquad } from "@/engine/scoring";
import { gameRatings } from "@/engine/ratings";
import { PageStatus, useAuctionData } from "@/hooks/useAuctionData";

export default function SummaryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, error } = useAuctionData(id);
  const view = useMemo(() => {
    if (!data) return null;
    const bought = data.userTeam.members.filter((m) => m.source === "auction");
    const spent = bought.reduce((s, m) => s + m.price, 0);
    const score = scoreSquad(data.userTeam.members.map((m) => ({ ...m.player, price: m.price })));
    const bw = bestAndWorst(
      data.userTeam.members.map((m) => ({
        name: m.player.name,
        price: m.price,
        actual2026Price: m.player.actual2026Price,
        overall: gameRatings(m.player).overall,
      })),
    );
    return { bought, spent, score, bw };
  }, [data]);
  if (!data || !view) return <PageStatus label="Loading summary..." error={error} />;
  return (
    <main className="mx-auto max-w-4xl px-5 py-8">
      <h1 className="display text-6xl">{data.status === "COMPLETE" ? "Auction complete" : "Auction in progress"}</h1>
      <p className="mt-2 text-white/55">{data.status === "COMPLETE" ? "Final table" : "Live snapshot — finish the remaining lots for the official close."}</p>
      <div className="mt-8 grid gap-3 md:grid-cols-3">
        <Tile l="Players bought" v={String(view.bought.length)} />
        <Tile l="Total spent" v={formatINR(view.spent)} />
        <Tile l="Remaining purse" v={formatINR(data.userTeam.purse)} />
      </div>
      <div className="glass mt-6 rounded-2xl p-5">
        <p className="text-[11px] uppercase tracking-widest text-white/40">Your auction score</p>
        <p className="display text-6xl gold">{view.score.overall}/100</p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
          <span>Batting {view.score.batting}</span>
          <span>Bowling {view.score.bowling}</span>
          <span>Balance {view.score.balance}</span>
          <span>Value {view.score.value}</span>
          <span>Bench {view.score.bench}</span>
          <span>Indian core {view.score.indianCore}</span>
          <span>Overseas {view.score.overseas}</span>
          <span>Age {view.score.ageProfile}</span>
        </div>
        {view.score.notes.map((n) => (
          <p key={n} className="mt-2 text-sm text-white/55">
            {n}
          </p>
        ))}
      </div>
      {data.challenge && (
        <div className="glass mt-6 rounded-2xl p-5">
          <p className="text-[11px] uppercase tracking-widest text-white/40">Challenge · {data.challenge.name}</p>
          <p className="display mt-1 text-3xl">
            {data.challenge.met ? "Completed" : data.status === "COMPLETE" ? "Not completed" : "In progress"}
          </p>
          <p className="mt-1 text-sm text-white/55">
            {data.challenge.detail} — {data.challenge.progress}
          </p>
        </div>
      )}
      <div className="mt-6 space-y-2 text-sm">
        <p>Best purchase: {view.bw.bestPurchase?.name ?? "—"}</p>
        <p>Biggest overpay vs 2026 market: {view.bw.biggestOverpay?.name ?? "—"}</p>
        <p>Best value vs 2026 market: {view.bw.bestValue?.name ?? "—"}</p>
      </div>
      <div className="mt-8 flex gap-4">
        <Link href={`/xi/${id}`} className="gold">
          Build playing XI →
        </Link>
        <Link href={`/analytics/${id}`} className="gold">
          Analytics →
        </Link>
        <Link href={`/replay/${id}`} className="gold">
          Replay →
        </Link>
      </div>
    </main>
  );
}

function Tile({ l, v }: { l: string; v: string }) {
  return (
    <div className="glass rounded-xl p-4">
      <p className="text-[10px] uppercase tracking-widest text-white/40">{l}</p>
      <p className="mt-1 text-xl">{v}</p>
    </div>
  );
}

"use client";

import Link from "next/link";
import { use } from "react";
import { Crest, Money } from "@/components/Brand";
import { formatINR } from "@/lib/money";
import { PageStatus, useAuctionData } from "@/hooks/useAuctionData";

export default function SquadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, error } = useAuctionData(id);
  if (!data) return <PageStatus label="Loading squad..." error={error} />;
  const t = data.userTeam;
  const counts = data.needs.counts;
  return (
    <main className="mx-auto max-w-5xl px-5 py-8">
      <Link href={`/auction/${id}`} className="text-sm gold">
        ← Auction room
      </Link>
      <h1 className="display mt-3 text-5xl">My team</h1>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card label="Purse" value={formatINR(t.purse)} />
        <Card label="Squad" value={`${t.members.length} / ${data.rules.maxSquadSize}`} />
        <Card label="Overseas" value={`${t.overseasCount} / ${data.rules.maxOverseasPlayers}`} />
        <Card label="Roles" value={`Bat ${counts.BATTER} · Bowl ${counts.BOWLER} · AR ${counts.ALL_ROUNDER} · WK ${counts.WICKETKEEPER}`} />
      </div>
      <ul className="mt-8 divide-y divide-white/10">
        {t.members.map((m) => (
          <li key={m.id} className="flex items-center justify-between py-3">
            <div>
              <p className="font-semibold">{m.player.name}</p>
              <p className="text-xs text-white/45">
                {m.player.role} · {m.source} · {m.player.isOverseas ? "Overseas" : "Indian"}
              </p>
            </div>
            <Money value={m.price} />
          </li>
        ))}
      </ul>
      <div className="mt-8 grid gap-2 md:grid-cols-2">
        {data.teams.map((team) => (
          <div key={team.id} className="glass flex items-center justify-between rounded-xl p-3">
            <span className="flex items-center gap-2">
              <Crest shortName={team.franchise.shortName} primary={team.franchise.primary} secondary={team.franchise.secondary} size={28} />
              {team.franchise.shortName}
            </span>
            <span className="text-sm text-white/60">
              {team.members.length} · <Money value={team.purse} />
            </span>
          </div>
        ))}
      </div>
    </main>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-xl p-4">
      <p className="text-[10px] uppercase tracking-widest text-white/40">{label}</p>
      <p className="mt-1 text-lg">{value}</p>
    </div>
  );
}

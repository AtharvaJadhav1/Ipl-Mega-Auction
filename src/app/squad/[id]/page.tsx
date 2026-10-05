"use client";

import Link from "next/link";
import { use, useState } from "react";
import { Crest, Money } from "@/components/Brand";
import { gameRatings } from "@/engine/ratings";
import { PageStatus, useAuctionData } from "@/hooks/useAuctionData";
import { formatINR } from "@/lib/money";

const ROLE_ORDER = ["WICKETKEEPER", "BATTER", "ALL_ROUNDER", "BOWLER"];

export default function SquadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, error } = useAuctionData(id);
  const [selected, setSelected] = useState<string | null>(null);
  if (!data) return <PageStatus label="Loading squad..." error={error} />;

  const t = data.teams.find((x) => x.franchiseId === selected) ?? data.userTeam;
  const counts: Record<string, number> = { BATTER: 0, BOWLER: 0, ALL_ROUNDER: 0, WICKETKEEPER: 0 };
  for (const m of t.members) counts[m.player.role] = (counts[m.player.role] ?? 0) + 1;
  const members = [...t.members].sort(
    (a, b) => ROLE_ORDER.indexOf(a.player.role) - ROLE_ORDER.indexOf(b.player.role) || b.price - a.price,
  );
  const spent = t.initialPurse - t.purse;

  return (
    <main className="mx-auto max-w-6xl px-5 py-8">
      <Link href={`/auction/${id}`} className="text-sm gold">
        ← Auction room
      </Link>
      <h1 className="display mt-3 text-5xl">{t.isUser ? "My team" : t.franchise.name}</h1>

      <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Choose a team">
        {data.teams.map((team) => (
          <button
            key={team.id}
            aria-pressed={team.franchiseId === t.franchiseId}
            onClick={() => setSelected(team.franchiseId)}
            className={`glass flex items-center gap-2 rounded-full px-3 py-1 text-sm ${team.franchiseId === t.franchiseId ? "paddle active" : ""}`}
          >
            <Crest shortName={team.franchise.shortName} primary={team.franchise.primary} secondary={team.franchise.secondary} size={22} />
            {team.franchise.shortName}
            {team.isUser ? " · You" : ""}
            <span className="text-xs text-white/50">{team.members.length}</span>
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Card label="Purse left" value={formatINR(t.purse)} />
        <Card label="Spent" value={formatINR(spent)} />
        <Card label="Squad" value={`${t.members.length} / ${data.rules.maxSquadSize}`} />
        <Card label="Overseas" value={`${t.overseasCount} / ${data.rules.maxOverseasPlayers}`} />
        <Card label="Roles" value={`Bat ${counts.BATTER} · Bowl ${counts.BOWLER} · AR ${counts.ALL_ROUNDER} · WK ${counts.WICKETKEEPER}`} />
      </div>

      <div className="mt-8 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">{t.franchise.name} squad</caption>
          <thead className="text-[11px] uppercase tracking-widest text-white/40">
            <tr>
              <th scope="col" className="py-2">Player</th>
              <th scope="col">Role</th>
              <th scope="col">Origin</th>
              <th scope="col">Age</th>
              <th scope="col">Price</th>
              <th scope="col">Runs</th>
              <th scope="col">SR</th>
              <th scope="col">Wkts</th>
              <th scope="col">Econ</th>
              <th scope="col">Rating</th>
              <th scope="col">Acquired</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => {
              const p = m.player;
              return (
                <tr key={m.id} className="border-t border-white/10">
                  <td className="py-2">
                    <span className="font-semibold">{p.name}</span>
                    <span className="block text-[11px] text-white/45">
                      {p.capped ? "Capped" : "Uncapped"} · {p.country}
                    </span>
                  </td>
                  <td>{p.role.replaceAll("_", " ")}</td>
                  <td>{p.isOverseas ? "Overseas" : "Indian"}</td>
                  <td>{p.age ?? "—"}</td>
                  <td>{m.price ? <Money value={m.price} /> : "—"}</td>
                  <td>{p.runs ?? "—"}</td>
                  <td>{p.strikeRate ?? "—"}</td>
                  <td>{p.wickets ?? "—"}</td>
                  <td>{p.economy ?? "—"}</td>
                  <td className="gold">{gameRatings(p).overall}</td>
                  <td className="capitalize text-white/60">{m.source}</td>
                </tr>
              );
            })}
            {!members.length && (
              <tr>
                <td colSpan={11} className="py-6 text-white/45">
                  No players yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
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

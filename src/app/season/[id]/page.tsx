"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { Crest } from "@/components/Brand";
import { PageStatus, useAuctionData } from "@/hooks/useAuctionData";
import type { StoredSeason } from "@/server/game";

type Teams = NonNullable<ReturnType<typeof useAuctionData>["data"]>["teams"];

export default function SeasonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, error } = useAuctionData(id);
  const [season, setSeason] = useState<StoredSeason | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/auction/${id}/season`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        setSeason(j.season ?? null);
        setLoaded(true);
      })
      .catch(() => !cancelled && setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function play(reroll: boolean) {
    setBusy(true);
    setProblem(null);
    try {
      const res = await fetch(`/api/auction/${id}/season`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reroll }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json) setProblem(json?.error ?? "Could not simulate the season.");
      else setSeason(json.season);
    } catch {
      setProblem("Network problem — try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!data || !loaded) return <PageStatus label="Loading season..." error={error} />;

  const teams: Teams = data.teams;
  const team = (tid: string) => teams.find((t) => t.franchiseId === tid);
  const userId = data.userTeam.franchiseId;
  const complete = data.status === "COMPLETE";
  const r = season?.result;
  const rank = r ? r.table.findIndex((row) => row.teamId === userId) + 1 : 0;
  const userRow = r?.table.find((row) => row.teamId === userId);
  const finish = !r
    ? ""
    : r.champion === userId
      ? "Champions!"
      : r.runnerUp === userId
        ? "Runners-up"
        : rank <= 4
          ? "Made the playoffs"
          : `Finished ${rank}${rank === 1 ? "st" : rank === 2 ? "nd" : rank === 3 ? "rd" : "th"}`;

  return (
    <main className="mx-auto max-w-6xl px-5 py-8">
      <Link href={`/auction/${id}`} className="text-sm gold">
        ← Room
      </Link>
      <h1 className="display mt-3 text-5xl">Season simulation</h1>
      <p className="mt-2 max-w-2xl text-sm text-white/55">
        Every franchise plays a double round-robin league, then Qualifier 1, the Eliminator, Qualifier 2 and the Final. Each side fields its best XI (yours is the XI you saved, or an
        auto-picked one) and results come from batting, bowling and depth ratings.
      </p>

      {!complete && (
        <p role="status" className="glass mt-5 rounded-xl p-4 text-sm text-white/70">
          The season starts once the auction is complete.
        </p>
      )}
      {complete && !r && (
        <button disabled={busy} onClick={() => play(false)} className="mt-6 rounded-full bg-[var(--gold)] px-8 py-3 text-sm font-semibold text-black">
          {busy ? "Playing 94 matches..." : "Play the season"}
        </button>
      )}
      {problem && (
        <p role="alert" className="mt-4 text-sm text-[var(--danger)]">
          {problem}
        </p>
      )}

      {r && season && (
        <>
          <section className="glass mt-6 grid gap-4 rounded-2xl p-5 md:grid-cols-3" aria-label="Season headline">
            <Headline label="Champions" value={team(r.champion)?.franchise.name ?? r.champion} />
            <Headline label="Your season" value={finish} sub={userRow ? `${userRow.won}W · ${userRow.lost}L · ${userRow.points} pts · NRR ${userRow.nrr}` : undefined} />
            <Headline label="Most valuable player" value={r.mvp ? season.names[r.mvp.playerId] ?? r.mvp.name : "—"} sub={r.mvp ? `${r.mvp.runs} runs · ${r.mvp.wickets} wkts` : undefined} />
          </section>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <section aria-label="Points table" className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Points table</caption>
                <thead className="text-[11px] uppercase tracking-widest text-white/40">
                  <tr>
                    <th scope="col" className="py-2">#</th>
                    <th scope="col">Team</th>
                    <th scope="col">P</th>
                    <th scope="col">W</th>
                    <th scope="col">L</th>
                    <th scope="col">NRR</th>
                    <th scope="col">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {r.table.map((row, i) => {
                    const t = team(row.teamId);
                    return (
                      <tr key={row.teamId} className={`border-t border-white/10 ${row.teamId === userId ? "font-semibold" : ""} ${i < 4 ? "" : "opacity-70"}`}>
                        <td className="py-2">{i + 1}</td>
                        <td>
                          <span className="flex items-center gap-2">
                            {t && <Crest shortName={t.franchise.shortName} primary={t.franchise.primary} secondary={t.franchise.secondary} size={22} />}
                            {t?.franchise.shortName ?? row.shortName}
                            {row.teamId === userId ? " · You" : ""}
                          </span>
                        </td>
                        <td>{row.played}</td>
                        <td>{row.won}</td>
                        <td>{row.lost}</td>
                        <td>{row.nrr > 0 ? "+" : ""}{row.nrr.toFixed(3)}</td>
                        <td className="gold">{row.points}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="mt-2 text-[11px] text-white/40">Top four qualify for the playoffs.</p>
            </section>

            <section aria-label="Playoffs" className="space-y-2">
              <p className="text-[11px] uppercase tracking-widest text-white/45">Playoffs</p>
              {r.playoffs.map((g) => (
                <div key={g.stage} className="glass rounded-xl p-3 text-sm">
                  <p className="text-[10px] uppercase tracking-widest text-white/40">{g.stage}</p>
                  <p className="mt-1 flex justify-between">
                    <span className={g.winner === g.teamA ? "gold font-semibold" : ""}>{team(g.teamA)?.franchise.shortName} {g.scoreA}</span>
                    <span className={g.winner === g.teamB ? "gold font-semibold" : ""}>{g.scoreB} {team(g.teamB)?.franchise.shortName}</span>
                  </p>
                </div>
              ))}
            </section>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <Leaders title="Orange Cap · most runs" rows={r.topBatters.map((l) => ({ name: season.names[l.playerId] ?? l.name, team: team(l.teamId)?.franchise.shortName ?? "", value: `${l.runs}` }))} />
            <Leaders title="Purple Cap · most wickets" rows={r.topBowlers.map((l) => ({ name: season.names[l.playerId] ?? l.name, team: team(l.teamId)?.franchise.shortName ?? "", value: `${l.wickets}` }))} />
          </div>

          <button disabled={busy} onClick={() => play(true)} className="glass mt-6 rounded-full px-6 py-2.5 text-sm">
            {busy ? "Replaying..." : `Replay the season${season.rerolls ? ` (replayed ${season.rerolls}×)` : ""}`}
          </button>
        </>
      )}
    </main>
  );
}

function Headline({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-white/40">{label}</p>
      <p className="display mt-1 text-3xl">{value}</p>
      {sub && <p className="mt-1 text-xs text-white/55">{sub}</p>}
    </div>
  );
}

function Leaders({ title, rows }: { title: string; rows: { name: string; team: string; value: string }[] }) {
  return (
    <section className="glass rounded-2xl p-4" aria-label={title}>
      <p className="text-[11px] uppercase tracking-widest text-white/45">{title}</p>
      <ol className="mt-2 space-y-1 text-sm">
        {rows.map((row, i) => (
          <li key={`${row.name}-${i}`} className="flex justify-between">
            <span>
              {i + 1}. {row.name} <span className="text-white/45">{row.team}</span>
            </span>
            <span className="gold">{row.value}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

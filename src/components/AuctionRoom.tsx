"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Crest, Money } from "@/components/Brand";
import { useAuction } from "@/hooks/useAuction";
import { sfx } from "@/lib/sfx";
import { formatINR } from "@/lib/money";
import type { AuctionView, TeamView } from "@/lib/types";

export function AuctionRoom({ id }: { id: string }) {
  const game = useAuction(id);
  const [soundOverride, setSoundOverride] = useState<boolean | null>(null);
  const d = game.data;
  const sound = soundOverride ?? d?.soundEnabled ?? true;
  const lastSoundEvent = useRef<string | null>(null);
  const lastEvent = d?.events?.[0];
  const lastEventId = lastEvent?.id;
  const lastEventType = lastEvent?.type;

  // Play a sound once per new event (not on every refresh of the same data).
  useEffect(() => {
    if (!lastEventId || !lastEventType) return;
    if (lastSoundEvent.current === null) {
      lastSoundEvent.current = lastEventId;
      return;
    }
    if (lastSoundEvent.current === lastEventId) return;
    lastSoundEvent.current = lastEventId;
    if (!sound) return;
    if (lastEventType === "BID") sfx.bid();
    if (lastEventType === "PLAYER_SOLD") sfx.sold();
    if (lastEventType === "PLAYER_UNSOLD") sfx.unsold();
    if (lastEventType === "PLAYER_STARTED") sfx.intro();
    if (lastEventType === "GOING_ONCE" || lastEventType === "GOING_TWICE") sfx.hammer();
  }, [lastEventId, lastEventType, sound]);

  const shake = lastEvent?.type === "BID" && (lastEvent.amount ?? 0) >= 100_000_000;
  const user = d?.userTeam;
  const lot = d?.currentLot;
  const player = lot?.player;
  const passed: string[] = d?.passedTeamIds ?? [];
  const canBid = d?.status === "LIVE" && (d.phase === "BIDDING" || d.phase === "HAMMER") && !d.userBidError;
  const recentBids = (d?.bids ?? []).filter((b) => b.lotId === lot?.id).slice(0, 12);
  const leader = d?.teams.find((t) => t.franchiseId === lot?.currentBidderId);

  if (!d) {
    return <div className="p-10 text-sm text-white/60">{game.error || "Loading auction room..."}</div>;
  }

  return (
    <div className={`min-h-screen ${shake ? "shake" : ""}`}>
      <header className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-[var(--line)] px-4 py-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] gold">IPL Mega Auction</p>
          <h1 className="display text-2xl">
            Set {d.setName} · Player {d.currentLotIndex + 1} / {d.lots.length}
          </h1>
        </div>
        <div className="flex flex-wrap justify-center gap-2 text-xs">
          <NavChip href={`/auction/${id}`} label="Room" />
          <NavChip href={`/squad/${id}`} label="Squad" />
          <NavChip href={`/players?sessionId=${id}`} label="Players" />
          <NavChip href={`/analytics/${id}`} label="Analytics" />
          <NavChip href={`/xi/${id}`} label="XI" />
          <NavChip href={`/summary/${id}`} label="Summary" />
          <NavChip href={`/replay/${id}`} label="Replay" />
        </div>
        <div className="flex items-center justify-end gap-4 text-right">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/45">Purse</p>
            <p className="display text-2xl gold">
              <Money value={user?.purse ?? 0} />
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/45">Squad</p>
            <p className="display text-2xl">
              {user?.members.length}/{d.rules.maxSquadSize}
            </p>
          </div>
          <button
            className="glass rounded-full px-3 py-1 text-[11px] uppercase tracking-widest"
            onClick={() => {
              setSoundOverride(!sound);
              sfx.click();
            }}
          >
            Sound {sound ? "On" : "Off"}
          </button>
        </div>
      </header>

      <div className="ticker-wrap overflow-hidden border-b border-[var(--line)] bg-black/30 py-2 text-[11px] uppercase tracking-[0.18em]">
        <div className="ticker flex gap-10 whitespace-nowrap px-4 text-white/70">
          {(d.events ?? []).slice(0, 12).map((e) => (
            <span key={e.id}>
              <span className="gold">Live</span> {e.message}
            </span>
          ))}
        </div>
      </div>

      <div className="grid gap-4 p-4 xl:grid-cols-[280px_minmax(0,1fr)_300px]">
        <aside className="glass rounded-2xl p-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/45">Bidding history</p>
          <ul className="mt-3 space-y-2 text-sm">
            {recentBids.map((b) => {
              const team = d.teams.find((t) => t.franchiseId === b.teamId);
              return (
                <li key={b.id} className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="flex items-center gap-2">
                    <Crest shortName={team?.franchise.shortName ?? "?"} primary={team?.franchise.primary ?? "#444"} secondary={team?.franchise.secondary ?? "#111"} size={24} />
                    {team?.franchise.shortName}
                    {team?.isUser ? " · You" : ""}
                  </span>
                  <span className="gold">{formatINR(b.amount)}</span>
                </li>
              );
            })}
            {!recentBids.length && <li className="text-white/40">Waiting for the first paddle.</li>}
          </ul>
          <div className="mt-6">
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/45">Squad needs</p>
            <ul className="mt-2 space-y-1 text-xs text-white/70">
              {d.needs.items.map((n) => (
                <li key={n.label}>
                  {"★".repeat(n.stars)}
                  {"☆".repeat(Math.max(0, 5 - n.stars))} {n.label}
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <section className="glass relative overflow-hidden rounded-2xl p-5">
          {player && (
            <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
              <div className="flex flex-col items-center text-center">
                <div
                  className="grid h-52 w-44 place-items-center rounded-xl border border-[var(--line)]"
                  style={{
                    background: `linear-gradient(180deg, ${leader?.franchise.primary ?? "#888888"}33, #0b0d14)`,
                  }}
                >
                  <div>
                    <p className="display text-5xl">{player.shortName.slice(0, 2).toUpperCase()}</p>
                    <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-white/50">{player.country}</p>
                  </div>
                </div>
                <p className="mt-3 text-[11px] uppercase tracking-[0.22em] gold">{d.setName}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.25em] text-white/45">
                  {player.capped ? "Capped" : "Uncapped"} · {player.isOverseas ? "Overseas" : "Indian"}
                </p>
                <h2 className="display mt-1 text-5xl leading-none">{player.name}</h2>
                <p className="mt-2 text-white/70">
                  {prettyRole(player.role)}
                  {player.age ? ` · Age ${player.age}` : " · Age unknown"}
                  {player.battingStyle ? ` · ${player.battingStyle}` : ""}
                  {player.bowlingStyle ? ` · ${player.bowlingStyle}` : ""}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                  <Stat label="Base" value={formatINR(d.basePrice)} />
                  <Stat label="Current bid" value={lot.currentBid ? formatINR(lot.currentBid) : "—"} />
                  <Stat label="Next bid" value={formatINR(d.nextBid)} />
                  <Stat label="2026 sold" value={player.actual2026Price ? formatINR(player.actual2026Price) : "Not auctioned / unknown"} />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                  <Stat label="2026 runs" value={player.runs ?? "Unknown"} />
                  <Stat label="Strike rate" value={player.strikeRate ?? "Unknown"} />
                  <Stat label="2026 wickets" value={player.wickets ?? "Unknown"} />
                  <Stat label="Game rating" value={d.ratings ? `${d.ratings.overall}` : "—"} />
                </div>
                <p className="mt-3 text-[11px] text-white/40">{player.dataNotes} · {player.statsSource}</p>
              </div>
            </div>
          )}

          {d.phase === "INTRO" && (
            <div className="mt-8 flex flex-col items-center gap-3">
              <p className="display text-3xl gold">The bidding is about to start</p>
              <button className="rounded-full bg-[var(--gold)] px-8 py-3 text-sm font-semibold text-black" onClick={() => game.begin()}>
                Start bidding
              </button>
            </div>
          )}

          {(d.phase === "SOLD" || d.phase === "UNSOLD") && (
            <SoldBanner session={d} />
          )}

          {d.phase === "HAMMER" && (
            <p className="hammer mt-6 text-center display text-4xl gold">
              {d.hammerCount === 1 ? "GOING ONCE" : "GOING TWICE"}
            </p>
          )}

          {d.status === "COMPLETE" && (
            <div className="mt-8 text-center">
              <p className="display text-4xl">Auction complete</p>
              <Link href={`/summary/${id}`} className="mt-3 inline-block gold">
                View summary →
              </Link>
            </div>
          )}

          {game.error && <p className="mt-4 text-sm text-[var(--danger)]">{game.error}</p>}
        </section>

        <aside className="space-y-2">
          {d.teams.map((t) => {
            const active = lot?.currentBidderId === t.franchiseId;
            const out = passed.includes(t.franchiseId);
            const intel = d.intelligence?.find((i) => i.teamId === t.franchiseId);
            return (
              <div key={t.id} className={`glass paddle flex items-center gap-3 rounded-xl p-2 ${active ? "active" : ""}`}>
                <Crest shortName={t.franchise.shortName} primary={t.franchise.primary} secondary={t.franchise.secondary} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {t.franchise.shortName} {t.isUser ? "· YOU" : ""}
                  </p>
                  <p className="text-[11px] text-white/50">
                    <Money value={t.purse} /> · {t.members.length} ply · OS {t.overseasCount}/{d.rules.maxOverseasPlayers}
                  </p>
                  <p className="text-[10px] uppercase tracking-widest text-white/35">
                    {out ? "Passed" : active ? "Bidding" : intel?.likely ? "In hunt" : "Watching"}
                    {intel?.maxVisible && intel.maxBid != null ? ` · cap ${formatINR(intel.maxBid)}` : ""}
                  </p>
                </div>
              </div>
            );
          })}
        </aside>
      </div>

      <footer className="sticky bottom-0 border-t border-[var(--line)] bg-[#07080d]/90 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-6">
            <BigStat label="Current" value={lot?.currentBid ? formatINR(lot.currentBid) : "—"} />
            <BigStat label="Your next" value={formatINR(d.nextBid)} />
            <BigStat label="Overseas" value={`${user?.overseasCount ?? 0}/${d.rules.maxOverseasPlayers}`} />
          </div>
          <div className="flex flex-wrap gap-2">
            {(d.phase === "SOLD" || d.phase === "UNSOLD") && d.status === "LIVE" && (
              <button className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black" onClick={() => game.next()}>
                Next player
              </button>
            )}
            <button
              className="rounded-full bg-[var(--gold)] px-8 py-3 text-sm font-semibold text-black"
              disabled={!canBid || game.busy}
              onClick={() => game.bid()}
            >
              Bid {formatINR(d.nextBid)}
            </button>
            {d.userBidError && d.status === "LIVE" && (d.phase === "BIDDING" || d.phase === "HAMMER") && (
              <p className="self-center text-xs text-white/50">{d.userBidError}</p>
            )}
            <button
              className="glass rounded-full px-8 py-3 text-sm"
              disabled={d.status !== "LIVE" || passed.includes(user?.franchiseId ?? "") || lot?.currentBidderId === user?.franchiseId || d.phase === "INTRO" || d.phase === "SOLD" || d.phase === "UNSOLD"}
              onClick={() => game.pass()}
            >
              Pass
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

function NavChip({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="glass rounded-full px-3 py-1 uppercase tracking-widest text-white/70">
      {label}
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-white/10 px-3 py-2">
      <p className="text-[10px] uppercase tracking-widest text-white/40">{label}</p>
      <p className="mt-1 text-sm">{value}</p>
    </div>
  );
}

function BigStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-white/40">{label}</p>
      <p className="display text-2xl">{value}</p>
    </div>
  );
}

function prettyRole(role: string) {
  return role.replaceAll("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

function SoldBanner({ session }: { session: AuctionView }) {
  const lot = session.currentLot;
  if (!lot) return null;
  const team = session.teams.find((t: TeamView) => t.franchiseId === lot.soldTeamId);
  if (session.phase === "UNSOLD") {
    return (
      <div className="mt-8 text-center">
        <p className="display text-6xl text-white/40">UNSOLD</p>
        <p className="mt-2 text-white/60">{lot.player.name}</p>
      </div>
    );
  }
  const dots = Array.from({ length: 18 }, (_, i) => i);
  return (
    <div className="relative mt-8 overflow-hidden rounded-xl border border-[var(--gold)]/40 bg-black/40 py-8 text-center">
      {dots.map((i) => (
        <span
          key={i}
          className="confetti-dot absolute top-2 h-2 w-2 rounded-full"
          style={{
            left: `${(i * 6) % 100}%`,
            background: i % 2 ? "#e8c978" : "#fff",
            animationDelay: `${i * 40}ms`,
          }}
        />
      ))}
      <p className="display text-6xl gold">SOLD</p>
      <p className="mt-2 text-xl">{lot.player.name}</p>
      <p className="display mt-1 text-4xl">{formatINR(lot.soldPrice ?? lot.currentBid)}</p>
      <p className="mt-3 text-sm uppercase tracking-[0.3em] text-white/50">Bought by {team?.franchise.name ?? "—"}</p>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Crest, Money } from "@/components/Brand";
import { RetentionPanel } from "@/components/RetentionPanel";
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
  const lastEventAmount = lastEvent?.amount ?? 0;
  const lastEventMessage = lastEvent?.message ?? "";

  // Play a sound once per new event (not on every refresh of the same data).
  useEffect(() => {
    if (!lastEventId || !lastEventType) return;
    if (lastSoundEvent.current === null) {
      lastSoundEvent.current = lastEventId;
      return;
    }
    if (lastSoundEvent.current === lastEventId) return;
    lastSoundEvent.current = lastEventId;
    // Spoken commentary is its own preference; it highlights the moments that matter rather than every bid.
    const spoken = ["PLAYER_STARTED", "GOING_ONCE", "GOING_TWICE", "PLAYER_SOLD", "PLAYER_UNSOLD", "RTM_AVAILABLE", "RTM_MATCHED", "RTM_DECLINED", "PADDLE_WAR", "REVENGE", "GRUDGE"];
    if (spoken.includes(lastEventType) || (lastEventType === "BID" && lastEventAmount >= 50_000_000)) sfx.speak(lastEventMessage);
    if (!sound) return;
    if (lastEventType === "BID") sfx.bid(lastEventAmount);
    if (lastEventType === "PLAYER_SOLD") sfx.sold(lastEventAmount);
    if (lastEventType === "PLAYER_UNSOLD") sfx.unsold();
    if (lastEventType === "PLAYER_STARTED") sfx.intro();
    if (lastEventType === "GOING_ONCE" || lastEventType === "GOING_TWICE") sfx.hammer();
    if (lastEventType.startsWith("RTM")) sfx.rtm();
    if (lastEventType === "PADDLE_WAR") sfx.paddleWar();
  }, [lastEventId, lastEventType, lastEventAmount, lastEventMessage, sound]);

  const shake = lastEvent?.type === "BID" && (lastEvent.amount ?? 0) >= 100_000_000;
  const user = d?.userTeam;
  const lot = d?.currentLot;
  const player = lot?.player;
  const passed: string[] = d?.passedTeamIds ?? [];
  const canBid = d?.status === "LIVE" && !d.paused && (d.phase === "BIDDING" || d.phase === "HAMMER") && !d.userBidError;
  const recentBids = (d?.bids ?? []).filter((b) => b.lotId === lot?.id).slice(0, 12);
  const leader = d?.teams.find((t) => t.franchiseId === lot?.currentBidderId);

  const resolved = d?.status === "LIVE" && (d.phase === "SOLD" || d.phase === "UNSOLD");
  const canSkip = d?.status === "LIVE" && !d.paused && (d.phase === "INTRO" || d.phase === "BIDDING" || d.phase === "HAMMER");

  // Keyboard shortcuts: B bid, S skip, Enter start/next, Space pause, M/D match or decline an RTM.
  const handlers = useRef({ game, d, canBid, canSkip, resolved });
  useEffect(() => {
    handlers.current = { game, d, canBid, canSkip, resolved };
  });
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      const h = handlers.current;
      if (!h.d || h.game.busy) return;
      const key = e.key.toLowerCase();
      if (key === "b" && h.canBid) void h.game.bid();
      else if (key === "s" && h.canSkip) void h.game.skip();
      else if (key === "m" && h.d.rtmPending?.isUser && h.d.rtmPending.canMatch && !h.d.paused) void h.game.rtm("match");
      else if (key === "d" && h.d.rtmPending?.isUser && !h.d.paused) void h.game.rtm("decline");
      else if (key === " " && h.d.status === "LIVE" && h.d.phase !== "RETENTION") {
        e.preventDefault();
        void h.game.setPaused(!h.d.paused);
      } else if (key === "enter" && h.d.status === "LIVE" && !h.d.paused) {
        if (h.d.phase === "INTRO") void h.game.begin();
        else if (h.resolved) void h.game.next();
      } else return;
      if (key !== " ") e.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!d) {
    return <div className="p-10 text-sm text-white/60">{game.error || "Loading auction room..."}</div>;
  }

  return (
    <div className={`min-h-screen ${shake ? "shake" : ""}`}>
      <header className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-[var(--line)] px-4 py-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] gold">IPL Mega Auction</p>
          <h1 className="display text-2xl">
            {d.phase === "RETENTION" ? "Retention window" : `Set ${d.setName} · Player ${d.currentLotIndex + 1} / ${d.lots.length}`}
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
          <NavChip href={`/trade/${id}`} label="Trade" />
          <NavChip href="/history" label="Saved" />
        </div>
        <div className="flex items-center justify-end gap-4 text-right">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/45">Purse</p>
            <p className="display text-2xl gold">
              <Money value={user?.purse ?? 0} />
            </p>
          </div>
          {user && (d.mode === "mega" || d.mode === "mini") && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/45">RTM</p>
              <p className="display text-2xl">{user.rtmCards}</p>
            </div>
          )}
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
          {d.status === "LIVE" && d.phase !== "RETENTION" && (
            <>
              <button
                className="glass rounded-full px-3 py-1 text-[11px] uppercase tracking-widest"
                aria-pressed={d.paused}
                onClick={() => void game.setPaused(!d.paused)}
              >
                {d.paused ? "Resume" : "Pause"} <kbd>Space</kbd>
              </button>
              <label className="sr-only" htmlFor="speed">
                Auction speed
              </label>
              <select
                id="speed"
                className="glass rounded-full bg-transparent px-2 py-1 text-[11px] uppercase tracking-widest"
                value={d.speed}
                onChange={(e) => void game.setSpeed(e.target.value)}
              >
                <option value="slow">Slow</option>
                <option value="normal">Normal</option>
                <option value="fast">Fast</option>
                <option value="instant">Instant</option>
              </select>
            </>
          )}
        </div>
      </header>

      <div className="sr-only" role="status" aria-live="polite">
        {lastEvent?.message}
      </div>
      {d.paused && (
        <p role="alert" className="border-b border-[var(--line)] bg-black/40 py-2 text-center text-sm uppercase tracking-[0.3em] gold">
          Auction paused — press Space or Resume to continue
        </p>
      )}
      <div aria-hidden="true" className="ticker-wrap overflow-hidden border-b border-[var(--line)] bg-black/30 py-2 text-[11px] uppercase tracking-[0.18em]">
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

        <section className={`glass relative overflow-hidden rounded-2xl p-5 ${d.phase === "RETENTION" ? "xl:col-span-3" : ""}`}>
          {d.phase === "RETENTION" && <RetentionPanel data={d} busy={game.busy} onConfirm={(ids) => void game.retain(ids)} />}
          {d.phase !== "RETENTION" && player && (
            <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
              <div className="flex flex-col items-center text-center">
                <div
                  className="grid h-52 w-44 place-items-center rounded-xl border border-[var(--line)]"
                  style={{
                    background: `linear-gradient(180deg, ${leader?.franchise.primary ?? "#b9a7ff"}55, #ffffff99)`,
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
                {d.rtmHint && d.phase !== "SOLD" && d.phase !== "UNSOLD" && (
                  <p className="mt-3 text-xs gold">
                    {d.rtmHint.shortName} hold {d.rtmHint.cards} RTM card{d.rtmHint.cards === 1 ? "" : "s"} and can match the winning bid for their former player.
                  </p>
                )}
                <p className="mt-3 text-[11px] text-white/40">{player.dataNotes} · {player.statsSource}</p>
              </div>
            </div>
          )}

          {d.phase === "RTM" && d.rtmPending && (
            <div role="alertdialog" aria-label="Right to Match" className="mt-8 rounded-xl border border-[var(--gold)]/50 bg-black/30 p-6 text-center">
              <p className="text-[11px] uppercase tracking-[0.3em] gold">Right to Match</p>
              <p className="display mt-2 text-4xl">
                {d.rtmPending.isUser ? "Match the winning bid?" : `${d.rtmPending.shortName} are deciding…`}
              </p>
              <p className="mt-2 text-white/70">
                {player?.name} · {formatINR(d.rtmPending.price)} ({d.teams.find((t) => t.franchiseId === d.rtmPending?.winnerId)?.franchise.shortName ?? "?"} won the bid)
              </p>
              {d.rtmPending.isUser && (
                <div className="mt-5 flex flex-wrap justify-center gap-3">
                  <button
                    className="rounded-full bg-[var(--gold)] px-8 py-3 text-sm font-semibold text-black"
                    disabled={game.busy || d.paused || !d.rtmPending.canMatch}
                    onClick={() => void game.rtm("match")}
                  >
                    Use RTM at {formatINR(d.rtmPending.price)} <kbd>M</kbd>
                  </button>
                  <button className="glass rounded-full px-8 py-3 text-sm" disabled={game.busy || d.paused} onClick={() => void game.rtm("decline")}>
                    Decline <kbd>D</kbd>
                  </button>
                  {!d.rtmPending.canMatch && <p className="w-full text-xs text-white/50">You cannot afford to match (purse or squad limits).</p>}
                </div>
              )}
            </div>
          )}

          {d.phase === "INTRO" && (
            <p role="status" className="display mt-8 text-center text-3xl gold">
              {d.paused ? "Paused" : "Bidding opens in a moment…"}
            </p>
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
                    <Money value={t.purse} /> · {t.members.length} ply · OS {t.overseasCount}/{d.rules.maxOverseasPlayers}{t.rtmCards > 0 ? ` · RTM ${t.rtmCards}` : ""}
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

      {d.phase !== "RETENTION" && (
      <footer className="sticky bottom-0 border-t border-[var(--line)] bg-[#07080d]/90 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-6">
            <BigStat label="Current" value={lot?.currentBid ? formatINR(lot.currentBid) : "—"} />
            <BigStat label="Your next" value={formatINR(d.nextBid)} />
            <BigStat label="Overseas" value={`${user?.overseasCount ?? 0}/${d.rules.maxOverseasPlayers}`} />
          </div>
          <div className="flex flex-wrap gap-2">
            {(d.phase === "SOLD" || d.phase === "UNSOLD") && d.status === "LIVE" && (
              <button className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black" onClick={() => game.next()} disabled={game.busy || d.paused}>
                Next player <kbd>Enter</kbd>
              </button>
            )}
            <button
              className="rounded-full bg-[var(--gold)] px-8 py-3 text-sm font-semibold text-black"
              disabled={!canBid || game.busy}
              onClick={() => game.bid()}
            >
              Bid {formatINR(d.nextBid)} <kbd>B</kbd>
            </button>
            {d.userBidError && d.status === "LIVE" && (d.phase === "BIDDING" || d.phase === "HAMMER") && (
              <p className="self-center text-xs text-white/50">{d.userBidError}</p>
            )}
            <button
              className="glass rounded-full px-6 py-3 text-sm"
              disabled={!canSkip || game.busy}
              onClick={() => game.skip()}
            >
              Skip player — see result <kbd>S</kbd>
            </button>
          </div>
        </div>
      </footer>
      )}
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
            background: ["#ffb3c7", "#b8e6d4", "#c4b5fd", "#ffd9a8", "#a8d8ff"][i % 5],
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

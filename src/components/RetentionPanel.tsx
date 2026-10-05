"use client";

import { useMemo, useState } from "react";
import { planRetention, rtmCardsAfterRetention } from "@/engine/retention";
import { formatINR } from "@/lib/money";
import type { AuctionView } from "@/lib/types";

type Candidate = NonNullable<AuctionView["retention"]>["candidates"][number];

export function RetentionPanel({
  data,
  busy,
  onConfirm,
}: {
  data: AuctionView;
  busy: boolean;
  onConfirm: (playerIds: string[]) => void;
}) {
  const retention = data.retention!;
  const [picks, setPicks] = useState<string[]>([]);
  const byId = useMemo(() => new Map(retention.candidates.map((c) => [c.id, c])), [retention.candidates]);
  const picked = picks.map((id) => byId.get(id)).filter((c): c is Candidate => !!c);
  const plan = planRetention(picked, { maxOverseas: data.rules.maxOverseasPlayers });
  const reserve = Math.max(0, data.rules.minSquadSize - picked.length) * data.rules.minPlayerPrice;
  const tooExpensive = plan.total + reserve > data.userTeam.purse;
  const error = plan.error ?? (tooExpensive ? "Those retentions leave too little purse for a minimum squad." : null);

  function toggle(id: string) {
    setPicks((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }
  function moveUp(id: string) {
    setPicks((p) => {
      const i = p.indexOf(id);
      if (i <= 0) return p;
      const next = [...p];
      [next[i - 1], next[i]] = [next[i], next[i - 1]];
      return next;
    });
  }

  return (
    <div className="space-y-5" aria-labelledby="retention-title">
      <div>
        <p className="text-[11px] uppercase tracking-[0.28em] gold">Retention window</p>
        <h2 id="retention-title" className="display mt-1 text-4xl">
          Choose who to keep
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-white/60">
          Retain up to {retention.slabs.max} players ({retention.slabs.maxCapped} capped, {retention.slabs.maxUncapped} uncapped). Capped slabs follow your pick order:{" "}
          {retention.slabs.capped.map((c) => formatINR(c)).join(", ")}; uncapped {formatINR(retention.slabs.uncapped)}. Every slot you leave empty becomes a Right to Match card
          for players who leave your squad.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section aria-label="Your 2026 squad">
          <p className="text-[11px] uppercase tracking-widest text-white/45">Your 2026 squad ({retention.candidates.length})</p>
          <ul className="mt-2 max-h-[46vh] space-y-1 overflow-auto pr-1">
            {retention.candidates.map((c) => {
              const on = picks.includes(c.id);
              return (
                <li key={c.id}>
                  <button
                    onClick={() => toggle(c.id)}
                    aria-pressed={on}
                    className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm ${on ? "border-[var(--gold)] bg-white/10" : "border-white/10"}`}
                  >
                    <span>
                      {c.name}
                      <span className="block text-[11px] text-white/45">
                        {c.role.replaceAll("_", " ")} · {c.capped ? "Capped" : "Uncapped"} · {c.isOverseas ? "Overseas" : "Indian"}
                        {c.age ? ` · ${c.age}` : ""}
                      </span>
                    </span>
                    <span className="text-right text-xs">
                      <span className="gold">{c.overall}</span>
                      <span className="block text-white/40">{on ? "Retained" : "Retain"}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-label="Retention summary">
          <p className="text-[11px] uppercase tracking-widest text-white/45">Your retentions ({picked.length}/{retention.slabs.max})</p>
          <ol className="mt-2 space-y-1">
            {picked.map((c, i) => (
              <li key={c.id} className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2 text-sm">
                <span>
                  {i + 1}. {c.name}
                </span>
                <span className="flex items-center gap-3">
                  <span className="gold">{formatINR(plan.costs[i] ?? 0)}</span>
                  <button className="text-xs text-white/50 disabled:opacity-30" disabled={i === 0} onClick={() => moveUp(c.id)} aria-label={`Move ${c.name} up`}>
                    ↑
                  </button>
                </span>
              </li>
            ))}
            {!picked.length && <li className="text-sm text-white/40">Nobody retained. You will head into the auction with {rtmCardsAfterRetention(0)} RTM cards.</li>}
          </ol>
          <dl className="mt-4 grid grid-cols-3 gap-2 text-sm">
            <Cell label="Retention cost" value={formatINR(plan.total)} />
            <Cell label="Purse after" value={formatINR(data.userTeam.purse - plan.total)} />
            <Cell label="RTM cards" value={String(rtmCardsAfterRetention(picked.length))} />
          </dl>
          {error && (
            <p role="alert" className="mt-3 text-sm text-[var(--danger)]">
              {error}
            </p>
          )}
          <button
            disabled={busy || !!error}
            onClick={() => onConfirm(picks)}
            className="mt-4 rounded-full bg-[var(--gold)] px-8 py-3 text-sm font-semibold text-black"
          >
            {picked.length ? "Confirm retentions & open the auction" : "Skip retention & open the auction"}
          </button>
          <p className="mt-2 text-[11px] text-white/40">Rival franchises retain their own best players automatically.</p>
        </section>
      </div>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 px-3 py-2">
      <dt className="text-[10px] uppercase tracking-widest text-white/40">{label}</dt>
      <dd className="mt-1">{value}</dd>
    </div>
  );
}

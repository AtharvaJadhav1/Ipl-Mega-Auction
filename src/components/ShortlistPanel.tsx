"use client";

import { useState } from "react";
import { formatINR } from "@/lib/money";
import type { AuctionView } from "@/lib/types";

export function ShortlistPanel({ data, busy, onConfirm }: { data: AuctionView; busy: boolean; onConfirm: (playerIds: string[]) => void }) {
  const candidates = data.shortlist!.candidates;
  const [picks, setPicks] = useState<string[]>([]);
  const aiWanted = candidates.filter((c) => c.interest > 0).length;
  const total = new Set([...picks, ...candidates.filter((c) => c.interest > 0).map((c) => c.playerId)]).size;

  const toggle = (id: string) => setPicks((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <div className="space-y-4" aria-labelledby="shortlist-title">
      <div>
        <p className="text-[11px] uppercase tracking-[0.28em] gold">Accelerated round</p>
        <h2 id="shortlist-title" className="display mt-1 text-4xl">
          Shortlist the unsold players you want back
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-white/60">
          Franchises nominate the unsold players they still want. Only nominated players return to the floor, so tick anyone you would like to bid for.
          {aiWanted > 0 ? ` Rivals have already nominated ${aiWanted} player${aiWanted === 1 ? "" : "s"}.` : " No rival has nominated anyone yet."}
        </p>
      </div>
      <ul className="grid max-h-[48vh] gap-2 overflow-auto pr-1 md:grid-cols-2">
        {candidates.map((c) => {
          const on = picks.includes(c.playerId);
          return (
            <li key={c.playerId}>
              <button
                aria-pressed={on}
                onClick={() => toggle(c.playerId)}
                className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm ${on ? "border-[var(--gold)] bg-white/10" : "border-white/10"}`}
              >
                <span>
                  {c.name}
                  <span className="block text-[11px] text-white/45">
                    {c.role.replaceAll("_", " ")} · {c.capped ? "Capped" : "Uncapped"} · {c.isOverseas ? "Overseas" : "Indian"} · base {formatINR(c.basePrice)}
                  </span>
                </span>
                <span className="text-right text-xs">
                  <span className="gold">{c.overall}</span>
                  <span className="block text-white/45">
                    {c.interest > 0 ? `${c.interestedTeams.join(", ")}` : "No rival interest"}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <button disabled={busy} onClick={() => onConfirm(picks)} className="rounded-full bg-[var(--gold)] px-8 py-3 text-sm font-semibold text-black">
        {total ? `Start accelerated round (${total} player${total === 1 ? "" : "s"})` : "End the auction"}
      </button>
    </div>
  );
}

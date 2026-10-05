"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Crest } from "@/components/Brand";
import { formatINR } from "@/lib/money";

type Slot = {
  id: string;
  name: string | null;
  mode: string;
  difficulty: string;
  status: string;
  phase: string;
  challengeId: string | null;
  createdAt: string;
  updatedAt: string;
  franchise: { id: string; shortName: string; primary: string; secondary: string } | null;
  squadSize: number;
  purse: number;
  lotsDone: number;
  lotsTotal: number;
};

export default function HistoryPage() {
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const [version, setVersion] = useState(0);
  const reload = () => setVersion((v) => v + 1);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auctions", { cache: "no-store" })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Could not load saved auctions");
        if (!cancelled) setSlots(json.sessions);
      })
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [version]);

  async function rename(id: string) {
    const res = await fetch(`/api/auction/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: draft }),
    });
    if (res.ok) {
      setEditing(null);
      reload();
    } else setError("Could not rename that auction.");
  }

  async function remove(slot: Slot) {
    if (!window.confirm(`Delete "${slot.name ?? "this auction"}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/auction/${slot.id}`, { method: "DELETE" });
    if (res.ok) reload();
    else setError("Could not delete that auction.");
  }

  return (
    <main className="mx-auto max-w-5xl px-5 py-8">
      <Link href="/" className="text-sm gold">
        ← Home
      </Link>
      <h1 className="display mt-3 text-5xl">Saved auctions</h1>
      <p className="mt-2 text-sm text-white/55">Every auction is saved automatically. Resume one, review its summary, rename it or delete it.</p>
      {error && (
        <p role="alert" className="mt-4 text-sm text-[var(--danger)]">
          {error}
        </p>
      )}
      {!slots && !error && <p className="mt-6 text-white/60">Loading...</p>}
      {slots && !slots.length && (
        <p className="glass mt-6 rounded-xl p-5 text-white/70">
          No auctions yet.{" "}
          <Link href="/setup" className="gold">
            Start one →
          </Link>
        </p>
      )}
      <ul className="mt-6 space-y-3">
        {slots?.map((s) => {
          const pct = s.lotsTotal ? Math.round((s.lotsDone / s.lotsTotal) * 100) : 0;
          return (
            <li key={s.id} className="glass rounded-2xl p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  {s.franchise && <Crest shortName={s.franchise.shortName} primary={s.franchise.primary} secondary={s.franchise.secondary} size={40} />}
                  <div className="min-w-0">
                    {editing === s.id ? (
                      <form
                        className="flex gap-2"
                        onSubmit={(e) => {
                          e.preventDefault();
                          void rename(s.id);
                        }}
                      >
                        <label className="sr-only" htmlFor={`name-${s.id}`}>
                          Auction name
                        </label>
                        <input id={`name-${s.id}`} className="field" maxLength={60} value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />
                        <button className="rounded-full bg-[var(--gold)] px-4 text-sm font-semibold text-black">Save</button>
                      </form>
                    ) : (
                      <p className="truncate text-lg font-semibold">{s.name ?? `${s.franchise?.shortName ?? "?"} · ${s.mode}`}</p>
                    )}
                    <p className="text-xs text-white/50">
                      {s.mode} · {s.difficulty} · {s.status === "COMPLETE" ? "Complete" : s.phase === "RETENTION" ? "Retention window" : "In progress"} ·{" "}
                      {new Date(s.updatedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="text-right text-sm">
                  <p>
                    {s.squadSize} players · {formatINR(s.purse)}
                  </p>
                  <p className="text-xs text-white/50">
                    {s.lotsDone}/{s.lotsTotal} lots ({pct}%)
                  </p>
                </div>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
                <div className="h-full bg-[var(--gold)]" style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-sm">
                <Link href={`/auction/${s.id}`} className="rounded-full bg-[var(--gold)] px-4 py-1.5 font-semibold text-black">
                  {s.status === "COMPLETE" ? "Open" : "Resume"}
                </Link>
                <Link href={`/summary/${s.id}`} className="glass rounded-full px-4 py-1.5">
                  Summary
                </Link>
                {s.status === "COMPLETE" && (
                  <Link href={`/trade/${s.id}`} className="glass rounded-full px-4 py-1.5">
                    Trade
                  </Link>
                )}
                <button
                  className="glass rounded-full px-4 py-1.5"
                  onClick={() => {
                    setEditing(s.id);
                    setDraft(s.name ?? "");
                  }}
                >
                  Rename
                </button>
                <button className="glass rounded-full px-4 py-1.5 text-[var(--danger)]" onClick={() => void remove(s)}>
                  Delete
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}

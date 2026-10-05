"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { PageStatus, useAuctionData } from "@/hooks/useAuctionData";
import { formatINR } from "@/lib/money";

export default function ReplayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, error } = useAuctionData(id);
  const [hist, setHist] = useState<{ bids: { id: string; lotId: string; teamId: string; amount: number }[] } | null>(null);
  const [lotId, setLotId] = useState<string | null>(null);
  useEffect(() => {
    fetch(`/api/auction/${id}/history`)
      .then((r) => r.json())
      .then((j) => setHist(j.bids ? j : null))
      .catch(() => setHist(null));
  }, [id]);
  if (!data) return <PageStatus label="Loading replay..." error={error} />;
  const lot = data.lots.find((l) => l.id === lotId) ?? data.lots[0];
  const bids = (hist?.bids ?? []).filter((b) => b.lotId === lot?.id);
  return (
    <main className="mx-auto max-w-5xl px-5 py-8">
      <Link href={`/auction/${id}`} className="text-sm gold">
        ← Room
      </Link>
      <h1 className="display mt-3 text-5xl">Replay</h1>
      <div className="mt-6 grid gap-6 md:grid-cols-[220px_1fr]">
        <ul className="max-h-[70vh] overflow-auto text-sm">
          {data.lots.map((l, i) => (
            <li key={l.id}>
              <button className={`w-full py-2 text-left ${lot?.id === l.id ? "gold" : "text-white/60"}`} onClick={() => setLotId(l.id)}>
                {i + 1}. {l.player.name} · {l.status === "RETURNED" ? "RETURNED (re-auctioned)" : l.status}
              </button>
            </li>
          ))}
        </ul>
        {lot && (
          <div className="glass rounded-2xl p-5">
            <h2 className="display text-4xl">{lot.player.name}</h2>
            <p className="mt-2 text-white/60">
              {lot.status} {lot.soldPrice ? `· ${formatINR(lot.soldPrice)}` : ""} {lot.soldTeamId ? `· ${lot.soldTeamId.toUpperCase()}` : ""}
            </p>
            <ol className="mt-4 space-y-1 text-sm">
              {bids.map((b, i) => (
                <li key={b.id}>
                  {i + 1}. {b.teamId.toUpperCase()} {formatINR(b.amount)}
                </li>
              ))}
              {!bids.length && <li>No bids recorded.</li>}
            </ol>
          </div>
        )}
      </div>
    </main>
  );
}

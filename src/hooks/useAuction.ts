"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchAuction, type AuctionView } from "@/lib/types";

const SPEED: Record<string, number> = {
  slow: 1700,
  normal: 1000,
  fast: 420,
  instant: 70,
};
const RETRY_MS = 2500;

export function useAuction(id: string) {
  const [data, setData] = useState<AuctionView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Bumped after a failed action so the tick timer is re-armed (otherwise it would stall for good).
  const [retry, setRetry] = useState(0);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const pending = useRef(0);
  const failures = useRef(0);

  const refresh = useCallback(async () => {
    const json = await fetchAuction(id);
    setData(json);
    return json;
  }, [id]);

  /** Runs actions one at a time; user clicks queue behind an in-flight tick instead of being dropped. */
  const run = useCallback((path: string, opts: { silent?: boolean; body?: unknown } = {}) => {
    const task = queue.current.then(async () => {
      pending.current += 1;
      setBusy(true);
      if (!opts.silent) setError(null);
      try {
        const res = await fetch(path, {
          method: "POST",
          headers: opts.body !== undefined ? { "Content-Type": "application/json" } : undefined,
          body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
        });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json) {
          setError(json?.error || "Action failed");
          failures.current += 1;
          setRetry((n) => n + 1);
          return null;
        }
        failures.current = 0;
        setData(json as AuctionView);
        return json as AuctionView;
      } catch {
        setError("Network problem — retrying.");
        failures.current += 1;
        setRetry((n) => n + 1);
        return null;
      } finally {
        pending.current -= 1;
        if (pending.current === 0) setBusy(false);
      }
    });
    queue.current = task;
    return task;
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchAuction(id)
      .then((json) => !cancelled && setData(json))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!data || data.status !== "LIVE" || data.paused) return;
    // The next player opens for bidding on its own after a short intro.
    if (data.phase === "INTRO") {
      const t = setTimeout(() => {
        void run(`/api/auction/${id}/begin`, { silent: true });
      }, failures.current > 0 ? RETRY_MS : Math.max(600, SPEED[data.speed] ?? 1000));
      return () => clearTimeout(t);
    }
    if (["SOLD", "UNSOLD", "COMPLETE", "RETENTION"].includes(data.phase)) return;
    // The user's Right to Match decision is theirs alone.
    if (data.phase === "RTM" && data.rtmPending?.isUser) return;
    const user = data.userTeam;
    const lot = data.currentLot;
    const passed = data.passedTeamIds;
    const userOut = passed.includes(user.franchiseId);
    // Rivals keep bidding on their own; the room only pauses when the user alone could still open the lot.
    const aiLeft = data.teams.filter((t) => !t.isUser && !passed.includes(t.franchiseId)).length;
    const waitingOnUser = data.phase !== "RTM" && !userOut && lot?.currentBidderId == null && aiLeft === 0;
    if (waitingOnUser) return;
    const ms = failures.current > 0 ? RETRY_MS : (SPEED[data.speed] ?? 1000);
    const t = setTimeout(() => {
      void run(`/api/auction/${id}/tick`, { silent: true });
    }, ms);
    return () => clearTimeout(t);
  }, [data, id, run, retry]);

  return {
    data,
    error,
    busy,
    setError,
    refresh,
    bid: () => run(`/api/auction/${id}/bid`),
    pass: () => run(`/api/auction/${id}/pass`),
    tick: () => run(`/api/auction/${id}/tick`),
    next: () => run(`/api/auction/${id}/next`),
    skip: () => run(`/api/auction/${id}/skip`),
    begin: () => run(`/api/auction/${id}/begin`),
    rtm: (action: "match" | "decline") => run(`/api/auction/${id}/rtm`, { body: { action } }),
    retain: (playerIds: string[]) => run(`/api/auction/${id}/retention`, { body: { playerIds } }),
    setSpeed: (speed: string) => run(`/api/auction/${id}/settings`, { body: { speed }, silent: true }),
    setPaused: (paused: boolean) => run(`/api/auction/${id}/settings`, { body: { paused } }),
  };
}

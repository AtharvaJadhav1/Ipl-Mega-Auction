"use client";

import { useEffect, useState } from "react";
import { fetchAuction, type AuctionView } from "@/lib/types";

/** One-shot load of an auction snapshot for read-only pages. */
export function useAuctionData(id: string) {
  const [data, setData] = useState<AuctionView | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetchAuction(id)
      .then((json) => !cancelled && setData(json))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [id]);
  return { data, error };
}

export function PageStatus({ label, error }: { label: string; error: string | null }) {
  return <div className="p-8">{error ?? label}</div>;
}

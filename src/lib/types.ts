import type { getSession } from "@/server/game";

type Jsonify<T> = T extends Date
  ? string
  : T extends (infer U)[]
    ? Jsonify<U>[]
    : T extends object
      ? { [K in keyof T]: Jsonify<T[K]> }
      : T;

/** The auction payload as the browser receives it (dates arrive as ISO strings). */
export type AuctionView = Jsonify<NonNullable<Awaited<ReturnType<typeof getSession>>>>;
export type TeamView = AuctionView["teams"][number];
export type MemberView = TeamView["members"][number];

export async function fetchAuction(id: string): Promise<AuctionView> {
  const res = await fetch(`/api/auction/${id}`, { cache: "no-store" });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json) throw new Error(json?.error || "Failed to load auction");
  return json as AuctionView;
}

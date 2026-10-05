import type { Personality } from "@/engine/ai";

export type TradePlayer = {
  overall: number;
  capped: boolean;
  role: string;
  age: number | null;
};

/** Convex in rating so one star is worth more than two average players. */
export function tradeValue(p: TradePlayer): number {
  const base = Math.pow(Math.max(40, p.overall) / 50, 3) * 10;
  const experience = p.capped ? 1.05 : 1;
  const ageAdj = p.age == null ? 1 : p.age <= 24 ? 1.08 : p.age >= 35 ? 0.88 : 1;
  return base * experience * ageAdj;
}

const MARGIN: Record<Personality, number> = {
  conservative: 1.2,
  balanced: 1.1,
  "data-driven": 1.08,
  "bowling-focused": 1.1,
  aggressive: 1.0,
  "star-focused": 1.12,
};

export type TradeVerdict = { accepted: boolean; ratio: number; message: string };

/**
 * The AI team receives `give` (from the user) and parts with `get`.
 * `needFor` scales the value of an incoming player by how much the AI team wants that role.
 */
export function evaluateTrade(input: {
  give: TradePlayer[];
  get: TradePlayer[];
  personality: Personality;
  needFor: (role: string) => number;
}): TradeVerdict {
  const received = input.give.reduce((s, p) => s + tradeValue(p) * input.needFor(p.role), 0);
  let lost = input.get.reduce((s, p) => s + tradeValue(p), 0);
  if (input.personality === "star-focused" && input.get.some((p) => p.overall >= 85)) lost *= 1.15;
  if (lost <= 0) return { accepted: false, ratio: 0, message: "Select at least one player you want from them." };
  if (received <= 0) return { accepted: false, ratio: 0, message: "They are not interested in a deal with nothing on offer." };
  const need = MARGIN[input.personality] ?? 1.1;
  const ratio = received / lost;
  if (ratio >= need) {
    return { accepted: true, ratio, message: "Deal accepted." };
  }
  const shortfall = Math.round((need / ratio - 1) * 100);
  return { accepted: false, ratio, message: `Rejected — they would need roughly ${shortfall}% more value on your side.` };
}

import { describe, expect, it } from "vitest";
import { bestAndWorst } from "@/engine/scoring";
import { withSessionLock } from "@/lib/lock";

describe("bestAndWorst", () => {
  const players = [
    { name: "Cheap star", price: 10_000_000, actual2026Price: 40_000_000, overall: 90 },
    { name: "Pricey bench", price: 100_000_000, actual2026Price: 30_000_000, overall: 60 },
    { name: "Fair", price: 50_000_000, actual2026Price: 50_000_000, overall: 75 },
  ];

  it("picks the best overall-per-rupee purchase", () => {
    expect(bestAndWorst(players).bestPurchase?.name).toBe("Cheap star");
  });

  it("only reports an overpay when the player cost more than the market", () => {
    expect(bestAndWorst(players).biggestOverpay?.name).toBe("Pricey bench");
    expect(bestAndWorst(players.slice(0, 1)).biggestOverpay).toBeUndefined();
  });
});

describe("withSessionLock", () => {
  it("serialises work for the same session", async () => {
    const order: number[] = [];
    await Promise.all([
      withSessionLock("s", async () => {
        await new Promise((r) => setTimeout(r, 20));
        order.push(1);
      }),
      withSessionLock("s", async () => {
        order.push(2);
      }),
    ]);
    expect(order).toEqual([1, 2]);
  });
});

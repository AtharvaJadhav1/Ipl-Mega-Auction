import { beforeEach, describe, expect, it, vi } from "vitest";

const upsert = vi.fn((args: unknown) => Promise.resolve(args));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    season: { upsert: vi.fn(async () => ({})) },
    franchise: { upsert: vi.fn(async () => ({})) },
    player: { findMany: vi.fn(async () => []), createMany: vi.fn(async () => ({})), upsert: (args: unknown) => upsert(args) },
  },
}));

import { importCsv } from "@/server/game";

describe("importCsv", () => {
  beforeEach(() => upsert.mockClear());

  it("accepts a file without the optional capped column", async () => {
    const res = await importCsv("name,role,basePrice,country\nZed Probe,BATTER,2000000,India");
    expect(res.errors).toEqual([]);
    expect(res.ok).toBe(1);
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ capped: false }) }));
  });

  it("still reads capped when the column is present", async () => {
    await importCsv("name,role,basePrice,country,capped\nZed Probe,BATTER,2000000,India,TRUE");
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ capped: true }) }));
  });
});

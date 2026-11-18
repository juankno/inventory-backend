import { jest } from "@jest/globals";

import type { PrismaClient } from "../../../generated/prisma/client.ts";
import { PrismaCatalogCache } from "./prisma-catalog-cache.ts";

const fetchedAt = new Date("2026-11-18T15:00:00Z");

function setup(row: unknown = null) {
  const findUnique = jest.fn<(args: unknown) => Promise<unknown>>().mockResolvedValue(row);
  const upsert = jest.fn<(args: unknown) => Promise<unknown>>().mockResolvedValue({});
  const prisma = { catalogEntry: { findUnique, upsert } } as unknown as PrismaClient;
  return { findUnique, upsert, cache: new PrismaCatalogCache(prisma) };
}

describe("PrismaCatalogCache", () => {
  it("should read a saved product", async () => {
    const imageUrl = "https://images.openfoodfacts.org/images/products/770/200/400/3508/front_es.4.200.jpg";
    const { cache } = setup({ code: "7702004003508", name: "Arroz Diana 500 g", unit: "UNIT", imageUrl, fetchedAt });

    expect(await cache.find("7702004003508")).toEqual({
      entry: { name: "Arroz Diana 500 g", unit: "UNIT", imageUrl },
      fetchedAt,
    });
  });

  it("should read a code the public catalog did not know", async () => {
    const { cache } = setup({ code: "7702004003508", name: null, unit: null, imageUrl: null, fetchedAt });

    expect(await cache.find("7702004003508")).toEqual({ entry: null, fetchedAt });
  });

  it("should return null for a code never asked", async () => {
    const { cache } = setup(null);

    expect(await cache.find("7702004003508")).toBeNull();
  });

  it("should save or replace the answer", async () => {
    const { upsert, cache } = setup();

    await cache.save("7702004003508", { name: "Arroz Diana 500 g", unit: "UNIT" }, fetchedAt);
    await cache.save("7702004003515", null, fetchedAt);

    expect(upsert.mock.calls.map(([args]) => args)).toEqual([
      {
        where: { code: "7702004003508" },
        create: { code: "7702004003508", name: "Arroz Diana 500 g", unit: "UNIT", imageUrl: null, source: "OPEN_FOOD_FACTS", fetchedAt },
        update: { name: "Arroz Diana 500 g", unit: "UNIT", imageUrl: null, source: "OPEN_FOOD_FACTS", fetchedAt },
      },
      {
        where: { code: "7702004003515" },
        create: { code: "7702004003515", name: null, unit: null, imageUrl: null, source: "OPEN_FOOD_FACTS", fetchedAt },
        update: { name: null, unit: null, imageUrl: null, source: "OPEN_FOOD_FACTS", fetchedAt },
      },
    ]);
  });
});

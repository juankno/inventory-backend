import { jest } from "@jest/globals";

import type { PrismaClient } from "../../../generated/prisma/client.ts";
import { PrismaCommunityCatalog } from "./prisma-community-catalog.ts";

function setup(rows: unknown[]) {
  const queryRaw = jest.fn<(...args: unknown[]) => Promise<unknown>>().mockResolvedValue(rows);
  const prisma = { $queryRaw: queryRaw } as unknown as PrismaClient;
  return { queryRaw, catalog: new PrismaCommunityCatalog(prisma) };
}

describe("PrismaCommunityCatalog", () => {
  it("should return the shared name and unit only", async () => {
    const { catalog } = setup([{ name: "Arroz Diana 500 g", unit: "UNIT" }]);

    const entry = await catalog.findCommonEntry("7702004003508", "business-1", 3);

    expect(entry).toEqual({ name: "Arroz Diana 500 g", unit: "UNIT" });
  });

  it("should pass the code, the excluded business and the threshold as parameters", async () => {
    const { queryRaw, catalog } = setup([]);

    await catalog.findCommonEntry("7702004003508", "business-1", 3);

    const [strings, ...values] = queryRaw.mock.calls[0]!;
    expect(values).toEqual(["7702004003508", "business-1", 3]);
    const sql = (strings as string[]).join("?");
    expect(sql).toContain("COUNT(DISTINCT p.business_id) >=");
    expect(sql).not.toMatch(/sale_price|cost_price|stock/);
  });

  it("should return null when not enough businesses agree", async () => {
    const { catalog } = setup([]);

    await expect(catalog.findCommonEntry("7702004003508", "business-1", 3)).resolves.toBeNull();
  });
});

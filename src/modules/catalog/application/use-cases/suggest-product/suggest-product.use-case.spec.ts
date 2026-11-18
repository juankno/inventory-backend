import { jest } from "@jest/globals";

import {
  CommunityCatalogMock,
  ExternalCatalogMock,
} from "../../mocks/catalog.mocks.ts";
import { SuggestProduct } from "./suggest-product.use-case.ts";

const GTIN = "7702004003508";

function setup() {
  const community = new CommunityCatalogMock();
  const external = new ExternalCatalogMock();
  return { community, external, suggestProduct: new SuggestProduct(community, external) };
}

describe("SuggestProduct", () => {
  describe("execute", () => {
    it("should suggest the name other businesses use, excluding the caller's business", async () => {
      const { community, external, suggestProduct } = setup();
      community.entry = { name: "Arroz Diana 500 g", unit: "UNIT" };

      const suggestion = await suggestProduct.execute({ businessId: "business-1", code: GTIN });

      expect(suggestion).toEqual({ name: "Arroz Diana 500 g", unit: "UNIT", source: "COMMUNITY" });
      expect(community.calls).toEqual([
        { code: GTIN, excludeBusinessId: "business-1", minBusinesses: 3 },
      ]);
      expect(external.calls).toEqual([]);
    });

    it("should fall back to the public catalog when no businesses share a name", async () => {
      const { external, suggestProduct } = setup();
      external.entry = { name: "Arroz Diana 500 g", unit: "UNIT" };

      const suggestion = await suggestProduct.execute({ businessId: "business-1", code: GTIN });

      expect(suggestion).toEqual({ name: "Arroz Diana 500 g", unit: "UNIT", source: "OPEN_FOOD_FACTS" });
      expect(external.calls).toEqual([GTIN]);
    });

    it("should reject with SUGGESTION_NOT_FOUND when nobody knows the code", async () => {
      const { suggestProduct } = setup();

      const suggestion = suggestProduct.execute({ businessId: "business-1", code: GTIN });

      await expect(suggestion).rejects.toMatchObject({ code: "SUGGESTION_NOT_FOUND" });
    });

    it("should reject with SUGGESTION_NOT_FOUND when the public catalog fails", async () => {
      const { external, suggestProduct } = setup();
      external.error = new Error("timeout");
      const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);

      const suggestion = suggestProduct.execute({ businessId: "business-1", code: GTIN });

      await expect(suggestion).rejects.toMatchObject({ code: "SUGGESTION_NOT_FOUND" });
      warn.mockRestore();
    });

    it.each([
      ["an internal INV- code", "INV-7KQ2M9XA4T"],
      ["a GTIN with a wrong check digit", "7702004003509"],
      ["free text", "hola"],
    ])("should reject %s without querying any catalog", async (_case, code) => {
      const { community, external, suggestProduct } = setup();

      const suggestion = suggestProduct.execute({ businessId: "business-1", code });

      await expect(suggestion).rejects.toMatchObject({ code: "SUGGESTION_NOT_FOUND" });
      expect(community.calls).toEqual([]);
      expect(external.calls).toEqual([]);
    });
  });
});

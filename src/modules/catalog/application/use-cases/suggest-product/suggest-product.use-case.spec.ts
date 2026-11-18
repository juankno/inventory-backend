import { jest } from "@jest/globals";

import {
  CatalogCacheMock,
  CommunityCatalogMock,
  ExternalCatalogMock,
} from "../../mocks/catalog.mocks.ts";
import { SuggestProduct } from "./suggest-product.use-case.ts";

const GTIN = "7702004003508";
const DAY_MS = 24 * 60 * 60 * 1000;
const now = new Date("2026-11-18T15:00:00Z");
const daysAgo = (days: number) => new Date(now.getTime() - days * DAY_MS);
const arroz = { name: "Arroz Diana 500 g", unit: "UNIT" as const };

function setup() {
  const community = new CommunityCatalogMock();
  const cache = new CatalogCacheMock();
  const external = new ExternalCatalogMock();
  const suggestProduct = new SuggestProduct(community, cache, external);
  const suggest = (code = GTIN) => suggestProduct.execute({ businessId: "business-1", code }, now);
  return { community, cache, external, suggest };
}

// Los logs de cada consulta no ensucian la salida de las pruebas.
let info: ReturnType<typeof jest.spyOn>;
let warn: ReturnType<typeof jest.spyOn>;
beforeEach(() => {
  info = jest.spyOn(console, "info").mockImplementation(() => undefined);
  warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
});
afterEach(() => {
  info.mockRestore();
  warn.mockRestore();
});

describe("SuggestProduct", () => {
  describe("execute", () => {
    it("should suggest the name other businesses use, excluding the caller's business", async () => {
      const { community, external, suggest } = setup();
      community.entry = arroz;

      expect(await suggest()).toEqual({ ...arroz, imageUrl: null, imageLargeUrl: null, source: "COMMUNITY" });
      expect(community.calls).toEqual([
        { code: GTIN, excludeBusinessId: "business-1", minBusinesses: 3 },
      ]);
      expect(external.calls).toEqual([]);
    });

    it("should prefer other businesses over the saved public answer", async () => {
      const { community, cache, suggest } = setup();
      community.entry = arroz;
      cache.entries.set(GTIN, { entry: { name: "Arroz", unit: "UNIT" }, fetchedAt: daysAgo(1) });

      expect(await suggest()).toMatchObject({ name: "Arroz Diana 500 g", source: "COMMUNITY" });
    });

    it("should ask the public catalog and save its answer", async () => {
      const { cache, external, suggest } = setup();
      external.entry = arroz;

      expect(await suggest()).toEqual({ ...arroz, imageUrl: null, imageLargeUrl: null, source: "OPEN_FOOD_FACTS" });
      expect(external.calls).toEqual([GTIN]);
      expect(cache.entries.get(GTIN)).toEqual({ entry: arroz, fetchedAt: now });
    });

    it("should pass along the product photo from the public catalog and save it", async () => {
      const { cache, external, suggest } = setup();
      const photo = "https://images.openfoodfacts.org/images/products/770/200/400/3508/front_es.4.200.jpg";
      const large = photo.replace(".200.", ".400.");
      external.entry = { ...arroz, imageUrl: photo, imageLargeUrl: large };

      expect(await suggest()).toEqual({ ...arroz, imageUrl: photo, imageLargeUrl: large, source: "OPEN_FOOD_FACTS" });
      expect(cache.entries.get(GTIN)?.entry).toEqual({ ...arroz, imageUrl: photo, imageLargeUrl: large });
    });

    it("should answer with the base that knew the product, also when saved", async () => {
      const { cache, external, suggest } = setup();
      const shampoo = { name: "Champú Vichy 200ml", unit: "UNIT" as const, source: "OPEN_BEAUTY_FACTS" as const };
      external.entry = shampoo;

      expect(await suggest()).toMatchObject({ name: "Champú Vichy 200ml", source: "OPEN_BEAUTY_FACTS" });
      expect(info).toHaveBeenCalledWith("Sugerencia de producto: OPEN_BEAUTY_FACTS");

      external.entry = null;
      expect(await suggest()).toMatchObject({ source: "OPEN_BEAUTY_FACTS" });
      expect(cache.entries.get(GTIN)?.entry).toEqual(shampoo);
    });

    it("should use a saved answer for 90 days without asking again", async () => {
      const { cache, external, suggest } = setup();
      cache.entries.set(GTIN, { entry: arroz, fetchedAt: daysAgo(89) });

      expect(await suggest()).toEqual({ ...arroz, imageUrl: null, imageLargeUrl: null, source: "OPEN_FOOD_FACTS" });
      expect(external.calls).toEqual([]);
    });

    it("should ask again and replace an answer older than 90 days", async () => {
      const { cache, external, suggest } = setup();
      cache.entries.set(GTIN, { entry: { name: "Arroz", unit: "UNIT" }, fetchedAt: daysAgo(91) });
      external.entry = arroz;

      expect(await suggest()).toMatchObject({ name: "Arroz Diana 500 g" });
      expect(cache.entries.get(GTIN)).toEqual({ entry: arroz, fetchedAt: now });
    });

    it("should remember for 7 days that the public catalog does not know the code", async () => {
      const { cache, external, suggest } = setup();

      await expect(suggest()).rejects.toMatchObject({ code: "SUGGESTION_NOT_FOUND" });
      expect(cache.entries.get(GTIN)).toEqual({ entry: null, fetchedAt: now });

      cache.entries.set(GTIN, { entry: null, fetchedAt: daysAgo(6) });
      await expect(suggest()).rejects.toMatchObject({ code: "SUGGESTION_NOT_FOUND" });
      expect(external.calls).toEqual([GTIN]);

      cache.entries.set(GTIN, { entry: null, fetchedAt: daysAgo(8) });
      external.entry = arroz;
      expect(await suggest()).toMatchObject({ name: "Arroz Diana 500 g" });
      expect(external.calls).toEqual([GTIN, GTIN]);
    });

    it("should not save anything when the public catalog fails", async () => {
      const { cache, external, suggest } = setup();
      external.error = new Error("timeout");

      await expect(suggest()).rejects.toMatchObject({ code: "SUGGESTION_NOT_FOUND" });
      expect(cache.entries.size).toBe(0);
    });

    it("should use an expired answer when the public catalog fails", async () => {
      const { cache, external, suggest } = setup();
      const old = { entry: arroz, fetchedAt: daysAgo(120) };
      cache.entries.set(GTIN, old);
      external.error = new Error("timeout");

      expect(await suggest()).toEqual({ ...arroz, imageUrl: null, imageLargeUrl: null, source: "OPEN_FOOD_FACTS" });
      expect(cache.entries.get(GTIN)).toBe(old);
    });

    it("should still suggest when the saved answers cannot be read or written", async () => {
      const { cache, external, suggest } = setup();
      cache.findError = new Error("db");
      cache.saveError = new Error("db");
      external.entry = arroz;

      expect(await suggest()).toEqual({ ...arroz, imageUrl: null, imageLargeUrl: null, source: "OPEN_FOOD_FACTS" });
    });

    it("should log where each answer came from, without the code", async () => {
      const { cache, suggest } = setup();
      cache.entries.set(GTIN, { entry: arroz, fetchedAt: daysAgo(1) });

      await suggest();

      expect(info).toHaveBeenCalledWith("Sugerencia de producto: CACHE");
    });

    it.each([
      ["an internal INV- code", "INV-7KQ2M9XA4T"],
      ["a GTIN with a wrong check digit", "7702004003509"],
      ["free text", "hola"],
    ])("should reject %s without querying any catalog", async (_case, code) => {
      const { community, external, suggest } = setup();

      await expect(suggest(code)).rejects.toMatchObject({ code: "SUGGESTION_NOT_FOUND" });
      expect(community.calls).toEqual([]);
      expect(external.calls).toEqual([]);
    });
  });
});

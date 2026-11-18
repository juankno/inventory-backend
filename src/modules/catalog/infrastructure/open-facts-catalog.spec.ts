import { jest } from "@jest/globals";

import type { ExternalCatalog } from "../application/ports/external-catalog.port.ts";
import {
  buildProductName,
  FirstMatchCatalog,
  fullSizeUrl,
  OPEN_BEAUTY_FACTS,
  OPEN_FOOD_FACTS,
  OpenFactsCatalog,
  safeImageUrl,
} from "./open-facts-catalog.ts";

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

function setup(response: Response, site = OPEN_FOOD_FACTS) {
  const fetchFn = jest.fn<typeof fetch>().mockResolvedValue(response);
  return { fetchFn, catalog: new OpenFactsCatalog(site, fetchFn) };
}

describe("buildProductName", () => {
  it("should prefer the Spanish name and add the brand and quantity", () => {
    expect(
      buildProductName({
        product_name_es: "Arroz",
        product_name: "Rice",
        brands: "Diana, Grupo Diana",
        quantity: "500 g",
      }),
    ).toBe("Arroz Diana 500 g");
  });

  it("should not repeat the brand or quantity already in the name", () => {
    expect(
      buildProductName({ product_name: "Leche ALPINA entera 1100 ml", brands: "Alpina", quantity: "1100 ml" }),
    ).toBe("Leche ALPINA entera 1100 ml");
  });

  it("should collapse spaces and cut long names at a word boundary", () => {
    const name = buildProductName({ product_name: `  Galletas   ${"muy ".repeat(30)}` });

    expect(name).toMatch(/^Galletas muy/);
    expect(name!.length).toBeLessThanOrEqual(80);
    expect(name!.endsWith("muy")).toBe(true);
  });

  it("should return null without a name", () => {
    expect(buildProductName({ brands: "Diana", quantity: "500 g" })).toBeNull();
  });
});

describe("safeImageUrl", () => {
  const photo = "https://images.openfoodfacts.org/images/products/770/381/200/4862/front_en.4.200.jpg";

  it("should accept a photo from the Open Food Facts image server", () => {
    expect(safeImageUrl(photo)).toBe(photo);
  });

  it.each([
    ["no photo", undefined],
    ["another server", "https://example.com/front.jpg"],
    ["plain http", photo.replace("https:", "http:")],
    ["a look-alike domain", "https://images.openfoodfacts.org.example.com/front.jpg"],
    ["a quote that breaks the address", `${photo}"onerror="x`],
    ["a photo from the other base", photo.replace("openfoodfacts", "openbeautyfacts")],
  ])("should reject %s", (_case, url) => {
    expect(safeImageUrl(url)).toBeNull();
  });

  it("should accept a photo from the image server of the base asked", () => {
    const beauty = "https://images.openbeautyfacts.org/images/products/333/787/131/1292/front_fr.16.200.jpg";
    expect(safeImageUrl(beauty, OPEN_BEAUTY_FACTS.imageHost)).toBe(beauty);
  });
});

describe("fullSizeUrl", () => {
  it("should turn the thumbnail into the original photo", () => {
    expect(fullSizeUrl("https://images.openfoodfacts.org/images/products/770/381/200/4862/front_en.4.200.jpg")).toBe(
      "https://images.openfoodfacts.org/images/products/770/381/200/4862/front_en.4.full.jpg",
    );
  });

  it("should return null for another form", () => {
    expect(fullSizeUrl("https://images.openfoodfacts.org/images/products/770/381/200/4862/front_en.png")).toBeNull();
  });
});

describe("OpenFactsCatalog", () => {
  it("should return the product sold by unit", async () => {
    const { fetchFn, catalog } = setup(
      jsonResponse(200, { status: 1, product: { product_name: "Arroz", brands: "Diana", quantity: "500 g" } }),
    );

    const entry = await catalog.findByGtin("7702004003508");

    expect(entry).toEqual({
      name: "Arroz Diana 500 g",
      unit: "UNIT",
      source: "OPEN_FOOD_FACTS",
      imageUrl: null,
      imageLargeUrl: null,
    });
    const [url, init] = fetchFn.mock.calls[0]!;
    expect(url).toContain("https://world.openfoodfacts.org/api/v2/product/7702004003508.json");
    expect(url).toContain("image_front_small_url");
    expect(url).toContain("image_front_url");
    expect((init?.headers as Record<string, string>)["User-Agent"]).toMatch(/^Surtido\//);
  });

  it("should return the thumbnail and the original photo for full screen", async () => {
    const small = "https://images.openfoodfacts.org/images/products/770/381/200/4862/front_en.4.200.jpg";
    const display = "https://images.openfoodfacts.org/images/products/770/381/200/4862/front_en.4.400.jpg";
    const full = "https://images.openfoodfacts.org/images/products/770/381/200/4862/front_en.4.full.jpg";
    const { catalog } = setup(
      jsonResponse(200, {
        status: 1,
        product: { product_name: "Refisal sal", image_front_small_url: small, image_front_url: display },
      }),
    );

    expect(await catalog.findByGtin("7703812004862")).toMatchObject({ imageUrl: small, imageLargeUrl: full });
  });

  it("should fall back to the 400 px photo when the thumbnail has another form", async () => {
    const small = "https://images.openfoodfacts.org/images/products/770/381/200/4862/front_en.png";
    const display = "https://images.openfoodfacts.org/images/products/770/381/200/4862/front_en.4.400.jpg";
    const { catalog } = setup(
      jsonResponse(200, {
        status: 1,
        product: { product_name: "Refisal sal", image_front_small_url: small, image_front_url: display },
      }),
    );

    expect(await catalog.findByGtin("7703812004862")).toMatchObject({ imageUrl: small, imageLargeUrl: display });
  });

  it("should not return a large photo without a thumbnail", async () => {
    const large = "https://images.openfoodfacts.org/images/products/770/381/200/4862/front_en.4.400.jpg";
    const { catalog } = setup(
      jsonResponse(200, { status: 1, product: { product_name: "Refisal sal", image_front_url: large } }),
    );

    expect(await catalog.findByGtin("7703812004862")).toMatchObject({ imageUrl: null, imageLargeUrl: null });
  });

  it("should ask Open Beauty Facts and accept its photos", async () => {
    const small = "https://images.openbeautyfacts.org/images/products/333/787/131/1292/front_fr.16.200.jpg";
    const { fetchFn, catalog } = setup(
      jsonResponse(200, {
        status: 1,
        product: { product_name: "Stimulating shampoo", brands: "Vichy", quantity: "200ml", image_front_small_url: small },
      }),
      OPEN_BEAUTY_FACTS,
    );

    expect(await catalog.findByGtin("3337871311292")).toEqual({
      name: "Stimulating shampoo Vichy 200ml",
      unit: "UNIT",
      source: "OPEN_BEAUTY_FACTS",
      imageUrl: small,
      imageLargeUrl: small.replace(".200.jpg", ".full.jpg"),
    });
    expect(fetchFn.mock.calls[0]![0]).toContain("https://world.openbeautyfacts.org/api/v2/product/");
  });

  it("should return null when the code is unknown", async () => {
    const { catalog } = setup(jsonResponse(404, { status: 0 }));

    await expect(catalog.findByGtin("7702004003508")).resolves.toBeNull();
  });

  it("should return null when the product has no name", async () => {
    const { catalog } = setup(jsonResponse(200, { status: 1, product: { brands: "Diana" } }));

    await expect(catalog.findByGtin("7702004003508")).resolves.toBeNull();
  });

  it("should fail when the service answers with an error", async () => {
    const { catalog } = setup(jsonResponse(503, {}));

    await expect(catalog.findByGtin("7702004003508")).rejects.toThrow("503");
  });
});

describe("FirstMatchCatalog", () => {
  const entry = (name: string) => ({ name, unit: "UNIT" as const });
  const catalog = (result: ReturnType<typeof entry> | null | Error): ExternalCatalog => ({
    findByGtin: async () => {
      if (result instanceof Error) throw result;
      return result;
    },
  });

  it("should prefer the first base that knows the code", async () => {
    const both = new FirstMatchCatalog([catalog(entry("Comida")), catalog(entry("Belleza"))]);

    expect(await both.findByGtin("1")).toEqual(entry("Comida"));
  });

  it("should use the second base when the first does not know the code", async () => {
    const both = new FirstMatchCatalog([catalog(null), catalog(entry("Champú"))]);

    expect(await both.findByGtin("1")).toEqual(entry("Champú"));
  });

  it("should use the base that answered when the other one fails", async () => {
    const both = new FirstMatchCatalog([catalog(new Error("caído")), catalog(entry("Champú"))]);

    expect(await both.findByGtin("1")).toEqual(entry("Champú"));
  });

  it("should return null only when every base says it does not know the code", async () => {
    expect(await new FirstMatchCatalog([catalog(null), catalog(null)]).findByGtin("1")).toBeNull();
  });

  it("should fail, not say not found, when a base fails and none knows the code", async () => {
    const both = new FirstMatchCatalog([catalog(null), catalog(new Error("caído"))]);

    await expect(both.findByGtin("1")).rejects.toThrow("caído");
  });

  it("should ask the bases at the same time", async () => {
    let running = 0;
    let maxRunning = 0;
    const slow: ExternalCatalog = {
      findByGtin: async () => {
        running += 1;
        maxRunning = Math.max(maxRunning, running);
        await new Promise((resolve) => setTimeout(resolve, 10));
        running -= 1;
        return null;
      },
    };

    await new FirstMatchCatalog([slow, slow]).findByGtin("1");

    expect(maxRunning).toBe(2);
  });
});

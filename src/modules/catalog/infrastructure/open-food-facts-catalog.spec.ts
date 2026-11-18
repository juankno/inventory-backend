import { jest } from "@jest/globals";

import { buildProductName, imageUrlOf, OpenFoodFactsCatalog } from "./open-food-facts-catalog.ts";

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

function setup(response: Response) {
  const fetchFn = jest.fn<typeof fetch>().mockResolvedValue(response);
  return { fetchFn, catalog: new OpenFoodFactsCatalog(fetchFn) };
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

describe("imageUrlOf", () => {
  const photo = "https://images.openfoodfacts.org/images/products/770/381/200/4862/front_en.4.200.jpg";

  it("should accept a photo from the Open Food Facts image server", () => {
    expect(imageUrlOf({ image_front_small_url: photo })).toBe(photo);
  });

  it.each([
    ["no photo", undefined],
    ["another server", "https://example.com/front.jpg"],
    ["plain http", photo.replace("https:", "http:")],
    ["a look-alike domain", "https://images.openfoodfacts.org.example.com/front.jpg"],
    ["a quote that breaks the address", `${photo}"onerror="x`],
  ])("should reject %s", (_case, url) => {
    expect(imageUrlOf({ image_front_small_url: url })).toBeNull();
  });
});

describe("OpenFoodFactsCatalog", () => {
  it("should return the product sold by unit", async () => {
    const { fetchFn, catalog } = setup(
      jsonResponse(200, { status: 1, product: { product_name: "Arroz", brands: "Diana", quantity: "500 g" } }),
    );

    const entry = await catalog.findByGtin("7702004003508");

    expect(entry).toEqual({ name: "Arroz Diana 500 g", unit: "UNIT", imageUrl: null });
    const [url, init] = fetchFn.mock.calls[0]!;
    expect(url).toContain("/api/v2/product/7702004003508.json");
    expect(url).toContain("image_front_small_url");
    expect((init?.headers as Record<string, string>)["User-Agent"]).toMatch(/^Surtido\//);
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

import { jest } from "@jest/globals";

import { buildProductName, fullSizeUrl, OpenFoodFactsCatalog, safeImageUrl } from "./open-food-facts-catalog.ts";

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
  ])("should reject %s", (_case, url) => {
    expect(safeImageUrl(url)).toBeNull();
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

describe("OpenFoodFactsCatalog", () => {
  it("should return the product sold by unit", async () => {
    const { fetchFn, catalog } = setup(
      jsonResponse(200, { status: 1, product: { product_name: "Arroz", brands: "Diana", quantity: "500 g" } }),
    );

    const entry = await catalog.findByGtin("7702004003508");

    expect(entry).toEqual({ name: "Arroz Diana 500 g", unit: "UNIT", imageUrl: null, imageLargeUrl: null });
    const [url, init] = fetchFn.mock.calls[0]!;
    expect(url).toContain("/api/v2/product/7702004003508.json");
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

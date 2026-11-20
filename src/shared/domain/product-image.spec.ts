import { isAllowedProductImageUrl } from "./product-image.ts";

const photo = "https://images.openfoodfacts.org/images/products/770/381/200/4862/front_en.4.200.jpg";

describe("isAllowedProductImageUrl", () => {
  it.each([
    ["Open Food Facts", photo],
    ["Open Beauty Facts", "https://images.openbeautyfacts.org/images/products/333/787/131/1292/front_fr.16.200.jpg"],
  ])("should accept a photo from %s", (_name, url) => {
    expect(isAllowedProductImageUrl(url)).toBe(true);
  });

  it.each([
    ["another server", "https://example.com/front.jpg"],
    ["plain http", photo.replace("https:", "http:")],
    ["a look-alike domain", "https://images.openfoodfacts.org.example.com/front.jpg"],
    ["a quote that breaks the address", `${photo}"onerror="x`],
    ["a very long address", `${photo}?${"a".repeat(500)}`],
  ])("should reject %s", (_name, url) => {
    expect(isAllowedProductImageUrl(url)).toBe(false);
  });
});

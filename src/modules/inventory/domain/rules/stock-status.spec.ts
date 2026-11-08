import { getStockStatus, withStockStatus } from "./stock-status.ts";

describe("getStockStatus", () => {
  it.each([
    ["zero stock with a minimum", 0, 5, "OUT_OF_STOCK"],
    ["zero stock without a minimum", 0, null, "OUT_OF_STOCK"],
    ["stock equal to the minimum", 5, 5, "LOW_STOCK"],
    ["stock below the minimum", 2.5, 3, "LOW_STOCK"],
    ["stock above the minimum", 6, 5, "OK"],
    ["stock without a minimum", 1, null, "OK"],
  ] as const)("should classify %s", (_case, stock, minStock, expected) => {
    const result = getStockStatus(stock, minStock);

    expect(result).toBe(expected);
  });
});

describe("withStockStatus", () => {
  it("should keep the product fields and add its status", () => {
    const product = {
      id: "product-1",
      name: "Panela",
      unit: "UNIT" as const,
      stock: 0,
      salePrice: 2500,
      minStock: 4,
      codeType: "INTERNAL" as const,
      code: "INV-7KQ2M9XA4T",
    };

    const result = withStockStatus(product);

    expect(result).toEqual({ ...product, status: "OUT_OF_STOCK" });
  });
});

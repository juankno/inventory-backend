import { hasAtMostTwoDecimals, isValidStockForUnit } from "./quantity.ts";

describe("hasAtMostTwoDecimals", () => {
  it.each([
    ["zero", 0],
    ["an integer", 30],
    ["one decimal", 0.5],
    ["two decimals", 1.25],
    ["a price with two decimals", 3500.99],
  ])("should accept %s", (_case, value) => {
    const result = hasAtMostTwoDecimals(value);

    expect(result).toBe(true);
  });

  it.each([
    ["three decimals", 1.255],
    ["many decimals", 0.333333],
  ])("should reject %s", (_case, value) => {
    const result = hasAtMostTwoDecimals(value);

    expect(result).toBe(false);
  });
});

describe("isValidStockForUnit", () => {
  it.each([
    ["zero units", 0, "UNIT"],
    ["an integer number of units", 30, "UNIT"],
    ["decimal kilograms", 1.25, "KILOGRAM"],
    ["decimal liters", 0.5, "LITER"],
  ] as const)("should accept %s", (_case, stock, unit) => {
    const result = isValidStockForUnit(stock, unit);

    expect(result).toBe(true);
  });

  it.each([
    ["half a unit", 0.5, "UNIT"],
    ["decimal units", 30.2, "UNIT"],
    ["kilograms with three decimals", 1.255, "KILOGRAM"],
  ] as const)("should reject %s", (_case, stock, unit) => {
    const result = isValidStockForUnit(stock, unit);

    expect(result).toBe(false);
  });
});

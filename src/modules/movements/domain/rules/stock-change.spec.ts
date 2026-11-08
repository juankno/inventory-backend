import {
  calculateStockChange,
  hasValidReason,
  isValidMovementQuantity,
} from "./stock-change.ts";

describe("hasValidReason", () => {
  it.each([
    ["an OUTBOUND with a reason", "OUTBOUND", "SALE"],
    ["an INBOUND without a reason", "INBOUND", undefined],
    ["an ADJUSTMENT without a reason", "ADJUSTMENT", undefined],
  ] as const)("should accept %s", (_case, type, reason) => {
    const result = hasValidReason(type, reason);

    expect(result).toBe(true);
  });

  it.each([
    ["an OUTBOUND without a reason", "OUTBOUND", undefined],
    ["an INBOUND with a reason", "INBOUND", "LOSS"],
    ["an ADJUSTMENT with a reason", "ADJUSTMENT", "CONSUMPTION"],
  ] as const)("should reject %s", (_case, type, reason) => {
    const result = hasValidReason(type, reason);

    expect(result).toBe(false);
  });
});

describe("isValidMovementQuantity", () => {
  it.each([
    ["a positive INBOUND", "INBOUND", 5, "UNIT"],
    ["a positive OUTBOUND", "OUTBOUND", 1, "UNIT"],
    ["an ADJUSTMENT counted as zero", "ADJUSTMENT", 0, "UNIT"],
    ["decimal kilograms", "OUTBOUND", 1.25, "KILOGRAM"],
  ] as const)("should accept %s", (_case, type, quantity, unit) => {
    const result = isValidMovementQuantity(type, quantity, unit);

    expect(result).toBe(true);
  });

  it.each([
    ["a zero INBOUND", "INBOUND", 0, "UNIT"],
    ["a zero OUTBOUND", "OUTBOUND", 0, "KILOGRAM"],
    ["a negative ADJUSTMENT", "ADJUSTMENT", -1, "UNIT"],
    ["half a unit", "OUTBOUND", 0.5, "UNIT"],
    ["three decimals", "INBOUND", 1.255, "KILOGRAM"],
  ] as const)("should reject %s", (_case, type, quantity, unit) => {
    const result = isValidMovementQuantity(type, quantity, unit);

    expect(result).toBe(false);
  });
});

describe("calculateStockChange", () => {
  it("should add the quantity on INBOUND", () => {
    const result = calculateStockChange("INBOUND", 6, 10);

    expect(result).toEqual({ quantity: 6, resultingStock: 16 });
  });

  it("should subtract the quantity on OUTBOUND", () => {
    const result = calculateStockChange("OUTBOUND", 4, 10);

    expect(result).toEqual({ quantity: 4, resultingStock: 6 });
  });

  it("should give a negative resulting stock when the OUTBOUND exceeds the stock", () => {
    const result = calculateStockChange("OUTBOUND", 11, 10);

    expect(result.resultingStock).toBe(-1);
  });

  it("should store the difference and set the counted stock on ADJUSTMENT", () => {
    const result = calculateStockChange("ADJUSTMENT", 7, 10);

    expect(result).toEqual({ quantity: -3, resultingStock: 7 });
  });

  it("should give a zero difference when the count matches the stock", () => {
    const result = calculateStockChange("ADJUSTMENT", 10, 10);

    expect(result).toEqual({ quantity: 0, resultingStock: 10 });
  });

  it("should round the decimal arithmetic to cents", () => {
    const inbound = calculateStockChange("INBOUND", 0.2, 0.1);
    const adjustment = calculateStockChange("ADJUSTMENT", 0.3, 0.1);

    expect(inbound.resultingStock).toBe(0.3);
    expect(adjustment.quantity).toBe(0.2);
  });
});

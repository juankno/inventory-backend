export type Unit = "UNIT" | "KILOGRAM" | "GRAM" | "POUND" | "LITER";

export const hasAtMostTwoDecimals = (value: number): boolean => {
  return Math.round(value * 100) / 100 === value;
};

export const isValidStockForUnit = (stock: number, unit: Unit): boolean => {
  if (!hasAtMostTwoDecimals(stock)) return false;
  return unit !== "UNIT" || Number.isInteger(stock);
};

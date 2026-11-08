import type { Unit } from "../../../../shared/domain/quantity.ts";
import type { StockStatus } from "../rules/stock-status.ts";

export interface InventoryProduct {
  id: string;
  name: string;
  unit: Unit;
  stock: number;
  salePrice: number | null;
  minStock: number | null;
  codeType: "GTIN" | "INTERNAL";
  code: string;
}

export interface InventoryProductWithStatus extends InventoryProduct {
  status: StockStatus;
}

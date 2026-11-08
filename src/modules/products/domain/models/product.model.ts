import type { Unit } from "../../../../shared/domain/quantity.ts";

export type CodeType = "GTIN" | "INTERNAL";

export interface Product {
  id: string;
  businessId: string;
  name: string;
  unit: Unit;
  salePrice: number | null;
  stock: number;
  minStock: number | null;
  codeType: CodeType;
  code: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

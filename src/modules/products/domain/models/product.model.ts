import type { Unit } from "../../../../shared/domain/quantity.ts";

export type CodeType = "GTIN" | "INTERNAL";

export interface Product {
  id: string;
  businessId: string;
  name: string;
  unit: Unit;
  salePrice: number | null;
  costPrice: number | null;
  stock: number;
  minStock: number | null;
  codeType: CodeType;
  code: string;
  /** Foto pública del producto (miniatura y tamaño original), si se registró con una. */
  imageUrl: string | null;
  imageLargeUrl: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

import type {
  InventoryProduct,
  InventoryProductWithStatus,
} from "../models/inventory-product.model.ts";

export type StockStatus = "OUT_OF_STOCK" | "LOW_STOCK" | "OK";

export const getStockStatus = (
  stock: number,
  minStock: number | null,
): StockStatus => {
  if (stock === 0) return "OUT_OF_STOCK";
  if (minStock !== null && stock <= minStock) return "LOW_STOCK";
  return "OK";
};

export const withStockStatus = (
  product: InventoryProduct,
): InventoryProductWithStatus => ({
  ...product,
  status: getStockStatus(product.stock, product.minStock),
});

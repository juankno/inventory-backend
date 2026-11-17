-- AlterTable
ALTER TABLE "products" ADD COLUMN "cost_price" DECIMAL(12,2);

-- AlterTable
ALTER TABLE "movements" ADD COLUMN "unit_cost" DECIMAL(12,2);

ALTER TABLE "products"
  ADD CONSTRAINT "products_cost_price_non_negative" CHECK ("cost_price" IS NULL OR "cost_price" >= 0);

ALTER TABLE "movements"
  ADD CONSTRAINT "movements_unit_cost_non_negative" CHECK ("unit_cost" IS NULL OR "unit_cost" >= 0);

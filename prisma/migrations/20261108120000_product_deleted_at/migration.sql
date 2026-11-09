-- AlterTable
ALTER TABLE "products" ADD COLUMN "deleted_at" TIMESTAMP(3);

-- Los productos ya eliminados toman como fecha su última modificación.
UPDATE "products" SET "deleted_at" = "updated_at" WHERE "is_active" = false;

-- is_active y deleted_at siempre dicen lo mismo.
ALTER TABLE "products"
  ADD CONSTRAINT "products_deleted_at_matches_is_active" CHECK ("is_active" = ("deleted_at" IS NULL));

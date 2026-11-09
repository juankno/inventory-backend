-- AlterTable
ALTER TABLE "movements"
  ADD COLUMN "unit_price" DECIMAL(12,2),
  ADD COLUMN "reverts_movement_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "movements_reverts_movement_id_key" ON "movements"("reverts_movement_id");

-- AddForeignKey
ALTER TABLE "movements"
  ADD CONSTRAINT "movements_reverts_movement_id_fkey" FOREIGN KEY ("reverts_movement_id") REFERENCES "movements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "movements"
  ADD CONSTRAINT "movements_unit_price_non_negative" CHECK ("unit_price" IS NULL OR "unit_price" >= 0);

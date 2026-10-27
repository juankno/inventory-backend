-- CreateEnum
CREATE TYPE "Unit" AS ENUM ('UNIT', 'KILOGRAM', 'GRAM', 'POUND', 'LITER');

-- CreateEnum
CREATE TYPE "CodeType" AS ENUM ('GTIN', 'INTERNAL');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('INBOUND', 'OUTBOUND', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "OutboundReason" AS ENUM ('SALE', 'CONSUMPTION', 'LOSS');

-- CreateTable
CREATE TABLE "businesses" (
    "id" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "businesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "owner_name" VARCHAR(80) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "data_policy_accepted_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "unit" "Unit" NOT NULL,
    "sale_price" DECIMAL(12,2),
    "stock" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "min_stock" DECIMAL(12,2),
    "code_type" "CodeType" NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movements" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "MovementType" NOT NULL,
    "reason" "OutboundReason",
    "quantity" DECIMAL(12,2) NOT NULL,
    "resulting_stock" DECIMAL(12,2) NOT NULL,
    "idempotency_key" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_business_id_key" ON "users"("business_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "products_business_id_is_active_name_idx" ON "products"("business_id", "is_active", "name");

-- CreateIndex
CREATE UNIQUE INDEX "products_business_id_code_key" ON "products"("business_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "movements_idempotency_key_key" ON "movements"("idempotency_key");

-- CreateIndex
CREATE INDEX "movements_product_id_created_at_idx" ON "movements"("product_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movements" ADD CONSTRAINT "movements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movements" ADD CONSTRAINT "movements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Reglas de integridad que Prisma no puede declarar en el esquema (DDS 7.3).
-- También se validan en la capa de dominio.
ALTER TABLE "products"
  ADD CONSTRAINT "products_stock_non_negative" CHECK ("stock" >= 0),
  ADD CONSTRAINT "products_min_stock_non_negative" CHECK ("min_stock" IS NULL OR "min_stock" >= 0),
  ADD CONSTRAINT "products_sale_price_non_negative" CHECK ("sale_price" IS NULL OR "sale_price" >= 0),
  ADD CONSTRAINT "products_unit_stock_integer" CHECK ("unit" <> 'UNIT' OR "stock" = TRUNC("stock"));

ALTER TABLE "movements"
  ADD CONSTRAINT "movements_quantity_by_type" CHECK (
    ("type" IN ('INBOUND', 'OUTBOUND') AND "quantity" > 0)
    OR ("type" = 'ADJUSTMENT' AND "quantity" <> 0)
  ),
  ADD CONSTRAINT "movements_reason_only_outbound" CHECK (
    ("type" = 'OUTBOUND' AND "reason" IS NOT NULL)
    OR ("type" <> 'OUTBOUND' AND "reason" IS NULL)
  ),
  ADD CONSTRAINT "movements_resulting_stock_non_negative" CHECK ("resulting_stock" >= 0);

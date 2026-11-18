-- CreateTable
CREATE TABLE "catalog_entries" (
    "code" VARCHAR(32) NOT NULL,
    "name" VARCHAR(80),
    "unit" "Unit",
    "source" VARCHAR(20) NOT NULL,
    "fetched_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_entries_pkey" PRIMARY KEY ("code")
);

-- Sin nombre ni unidad, la base pública no conocía el código: van los dos o ninguno.
ALTER TABLE "catalog_entries"
  ADD CONSTRAINT "catalog_entries_name_with_unit" CHECK (("name" IS NULL) = ("unit" IS NULL));

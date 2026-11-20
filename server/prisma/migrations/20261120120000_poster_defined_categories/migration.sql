-- Poster-defined categories: replace the fixed "Category" enum with a table.
-- Item.categoryId references it, so posters can pick an existing category or create a new one.

-- RenameEnum: the old "Category" enum conflicts with the new "Category" table's row type.
ALTER TYPE "Category" RENAME TO "Category_old";

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- Seed one row per legacy enum value so existing items keep their category.
INSERT INTO "Category" ("id", "name", "slug")
VALUES
    ('cat_key', 'Key', 'key'),
    ('cat_bottle', 'Bottle', 'bottle'),
    ('cat_charger', 'Charger', 'charger'),
    ('cat_umbrella', 'Umbrella', 'umbrella'),
    ('cat_calculator', 'Calculator', 'calculator'),
    ('cat_other', 'Other', 'other');

-- AlterTable: add the new column, backfill from the enum, then enforce NOT NULL.
ALTER TABLE "Item" ADD COLUMN "categoryId" TEXT;

UPDATE "Item" SET "categoryId" = CASE
    WHEN "category"::text = 'KEY' THEN 'cat_key'
    WHEN "category"::text = 'BOTTLE' THEN 'cat_bottle'
    WHEN "category"::text = 'CHARGER' THEN 'cat_charger'
    WHEN "category"::text = 'UMBRELLA' THEN 'cat_umbrella'
    WHEN "category"::text = 'CALCULATOR' THEN 'cat_calculator'
    ELSE 'cat_other'
END;

ALTER TABLE "Item" ALTER COLUMN "categoryId" SET NOT NULL;

-- DropIndex (on the old enum column)
DROP INDEX "Item_category_idx";

-- AlterTable: drop the enum column
ALTER TABLE "Item" DROP COLUMN "category";

-- DropEnum (renamed above)
DROP TYPE "Category_old";

-- CreateIndex
CREATE INDEX "Item_categoryId_idx" ON "Item"("categoryId");

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Split the single fused vector into textVector + imageVector.
-- Text-text and image-image CLIP scores live at different scales, so a fused
-- vector let wordy text-only items outrank genuine text->photo matches.
--
-- The old "vector" column cannot be reused: its meaning depended on whether the
-- item had photos. Rows are dropped and rebuilt by POST /items/reindex.
DROP TABLE IF EXISTS "ItemEmbedding";

CREATE TABLE "ItemEmbedding" (
    "itemId" TEXT NOT NULL,
    "textVector" DOUBLE PRECISION[] NOT NULL,
    "imageVector" DOUBLE PRECISION[] NOT NULL DEFAULT ARRAY[]::DOUBLE PRECISION[],
    "modelVersion" TEXT NOT NULL,
    "dim" INTEGER NOT NULL DEFAULT 512,
    "hasPhotos" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemEmbedding_pkey" PRIMARY KEY ("itemId")
);

CREATE INDEX "ItemEmbedding_modelVersion_idx" ON "ItemEmbedding"("modelVersion");

ALTER TABLE "ItemEmbedding" ADD CONSTRAINT "ItemEmbedding_itemId_fkey"
    FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

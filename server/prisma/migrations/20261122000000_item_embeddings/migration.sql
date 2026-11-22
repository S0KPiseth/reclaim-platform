-- CLIP item embeddings (see ItemEmbedding in schema.prisma).
-- Float[] maps to double precision[]; no pgvector extension required.
CREATE TABLE "ItemEmbedding" (
    "itemId" TEXT NOT NULL,
    "vector" DOUBLE PRECISION[],
    "modelVersion" TEXT NOT NULL,
    "dim" INTEGER NOT NULL DEFAULT 512,
    "source" TEXT NOT NULL DEFAULT 'item',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemEmbedding_pkey" PRIMARY KEY ("itemId")
);

CREATE INDEX "ItemEmbedding_modelVersion_idx" ON "ItemEmbedding"("modelVersion");

ALTER TABLE "ItemEmbedding" ADD CONSTRAINT "ItemEmbedding_itemId_fkey"
    FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

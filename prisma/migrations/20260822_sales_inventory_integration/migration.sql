-- Add isWonStage flag to PipelineColumn
ALTER TABLE "PipelineColumn" ADD COLUMN "isWonStage" BOOLEAN NOT NULL DEFAULT false;

-- Create DealLineItem table
CREATE TABLE "DealLineItem" (
  "id" TEXT NOT NULL,
  "dealId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unitPriceAtSale" DECIMAL(12,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DealLineItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "DealLineItem_dealId_idx" ON "DealLineItem"("dealId");
CREATE INDEX "DealLineItem_productId_idx" ON "DealLineItem"("productId");
ALTER TABLE "DealLineItem" ADD CONSTRAINT "DealLineItem_dealId_fkey"
  FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DealLineItem" ADD CONSTRAINT "DealLineItem_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

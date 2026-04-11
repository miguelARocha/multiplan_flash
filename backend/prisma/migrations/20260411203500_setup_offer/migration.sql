-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('ATIVA', 'ENCERRADA');

-- CreateTable
CREATE TABLE "offers" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "discountPercentage" INTEGER NOT NULL,
    "stock" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" "OfferStatus" NOT NULL DEFAULT 'ATIVA',
    "shopkeeperId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "offers_shopkeeperId_idx" ON "offers"("shopkeeperId");

-- CreateIndex
CREATE INDEX "offers_status_idx" ON "offers"("status");

-- CreateIndex
CREATE INDEX "offers_expiresAt_idx" ON "offers"("expiresAt");

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_shopkeeperId_fkey" FOREIGN KEY ("shopkeeperId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

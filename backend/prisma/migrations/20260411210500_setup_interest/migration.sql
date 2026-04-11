-- CreateTable
CREATE TABLE "interests" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "interests_buyerId_offerId_key" ON "interests"("buyerId", "offerId");

-- CreateIndex
CREATE INDEX "interests_buyerId_idx" ON "interests"("buyerId");

-- CreateIndex
CREATE INDEX "interests_offerId_idx" ON "interests"("offerId");

-- AddForeignKey
ALTER TABLE "interests" ADD CONSTRAINT "interests_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interests" ADD CONSTRAINT "interests_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

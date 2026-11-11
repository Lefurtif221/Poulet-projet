-- CreateTable
CREATE TABLE "CashClosing" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "cash" INTEGER NOT NULL DEFAULT 0,
    "wave" INTEGER NOT NULL DEFAULT 0,
    "orangeMoney" INTEGER NOT NULL DEFAULT 0,
    "credit" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "closedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashClosing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CashClosing_date_key" ON "CashClosing"("date");

-- CreateIndex
CREATE INDEX "CashClosing_date_idx" ON "CashClosing"("date");

-- AddForeignKey
ALTER TABLE "CashClosing" ADD CONSTRAINT "CashClosing_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

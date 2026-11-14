-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "creditAmount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "remainderAmount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "remainderMethod" "PaymentMethod";

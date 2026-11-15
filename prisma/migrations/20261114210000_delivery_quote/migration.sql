-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'PENDING_QUOTE';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "deliveryFeeCap" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "estimatedDeliveryFee" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "quotedAt" TIMESTAMP(3);

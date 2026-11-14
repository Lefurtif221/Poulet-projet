-- CreateEnum
CREATE TYPE "DeliveryMode" AS ENUM ('GROUPAGE', 'INDIVIDUAL');

-- CreateEnum
CREATE TYPE "Preparation" AS ENUM ('STANDARD', 'PLUCKED');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "deliveryMode" "DeliveryMode" NOT NULL DEFAULT 'INDIVIDUAL';

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "preparation" "Preparation" NOT NULL DEFAULT 'STANDARD',
ADD COLUMN     "preparationFee" INTEGER NOT NULL DEFAULT 0;

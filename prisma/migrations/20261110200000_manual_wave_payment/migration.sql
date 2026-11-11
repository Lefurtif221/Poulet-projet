-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'DECLARED';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "paymentLink" TEXT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "declaredAt" TIMESTAMP(3),
ADD COLUMN     "proofUrl" TEXT;

import type { Prisma, ProductCategory } from "@prisma/client";

export function productWhereInput({
  q,
  category,
  supplierId,
  maxPrice,
  includeOutOfStock,
}: {
  q?: string;
  category?: ProductCategory | "";
  supplierId?: string;
  maxPrice?: number;
  includeOutOfStock?: boolean;
}): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = {
    active: true,
    supplier: { user: { status: "ACTIVE" }, isOpen: true, isPaused: false },
    ...(includeOutOfStock ? {} : { stock: { gt: 0 } }),
  };

  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { supplier: { farmName: { contains: q, mode: "insensitive" } } },
    ];
  }
  if (category) where.category = category;
  if (supplierId) where.supplierId = supplierId;
  if (maxPrice && maxPrice > 0) where.price = { lte: maxPrice };

  return where;
}

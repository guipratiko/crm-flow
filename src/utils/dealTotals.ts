import { Prisma } from '@prisma/client';

export function recalcDealProductTotal(
  quantity: number,
  unitPrice: Prisma.Decimal | number,
  discount: Prisma.Decimal | number
): Prisma.Decimal {
  const q = quantity;
  const u = Number(unitPrice);
  const d = Number(discount);
  const total = Math.max(0, q * u - d);
  return new Prisma.Decimal(total);
}

export async function syncDealValueFromProducts(dealId: string, tenantId: string): Promise<void> {
  const { prisma } = await import('../lib/prisma');
  const items = await prisma.dealProduct.findMany({ where: { dealId, tenantId } });
  const sum = items.reduce((acc, i) => acc + Number(i.total), 0);
  await prisma.deal.update({
    where: { id: dealId },
    data: { value: new Prisma.Decimal(sum) },
  });
}

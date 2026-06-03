/** Includes Prisma reutilizados entre controllers e serviços. */

export const dealInclude = {
  stage: true,
  pipeline: true,
  company: { select: { id: true, name: true } },
  mainContact: { select: { id: true, name: true, email: true, phone: true } },
  contacts: { include: { contact: true } },
  products: { include: { product: true } },
} as const;

export const activityReminderInclude = {
  deal: { select: { id: true, title: true } },
  contact: { select: { id: true, name: true } },
  company: { select: { id: true, name: true } },
} as const;

import { z } from 'zod';

export const contactBody = z.object({
  name: z.string().min(1),
  email: z.union([z.string().email(), z.literal('')]).optional().nullable(),
  phone: z.string().optional().nullable(),
  whatsapp: z.string().optional().nullable(),
  position: z.string().optional().nullable(),
  companyId: z.string().uuid().optional().nullable(),
  responsibleUserId: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional().nullable(),
});

export const companyBody = z.object({
  name: z.string().min(1),
  document: z.string().optional().nullable(),
  segment: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.union([z.string().email(), z.literal('')]).optional().nullable(),
  address: z.string().optional().nullable(),
  responsibleUserId: z.string().optional().nullable(),
});

export const dealBody = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  value: z.number().optional(),
  status: z.enum(['open', 'won', 'lost']).optional(),
  probability: z.number().int().min(0).max(100).optional(),
  expectedCloseDate: z.string().datetime().optional().nullable(),
  pipelineId: z.string().uuid().optional(),
  stageId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional().nullable(),
  mainContactId: z.string().uuid().optional().nullable(),
  responsibleUserId: z.string().optional().nullable(),
  lossReason: z.string().optional().nullable(),
});

export const moveStageBody = z.object({
  stageId: z.string().uuid(),
  lossReason: z.string().optional().nullable(),
});

export const dealContactBody = z.object({
  contactId: z.string().uuid(),
  role: z.string().optional().nullable(),
});

export const dealProductBody = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive().optional(),
  unitPrice: z.number().optional(),
  discount: z.number().optional(),
});

export const productBody = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  price: z.number().optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

export const activityBody = z.object({
  type: z.enum(['call', 'meeting', 'task', 'email', 'whatsapp', 'followup', 'note']),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  status: z.enum(['pending', 'completed', 'cancelled']).optional(),
  contactId: z.string().uuid().optional().nullable(),
  companyId: z.string().uuid().optional().nullable(),
  dealId: z.string().uuid().optional().nullable(),
  responsibleUserId: z.string().optional().nullable(),
});

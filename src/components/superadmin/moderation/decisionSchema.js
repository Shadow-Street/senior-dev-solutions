import { z } from 'zod';

/** Decisions that change something for the author need a reason (the server enforces this too). */
export const NEEDS_REASON = ['remove_content', 'warn', 'suspend', 'ban'];
/** Decisions that ask for an explicit confirmation first. */
export const DESTRUCTIVE = ['remove_content', 'suspend', 'ban'];
export const SANCTIONS = ['warn', 'suspend', 'ban'];
export const MAX_SUSPENSION_DAYS = 365;

export const decisionSchema = z
  .object({
    action: z.enum(['approve', 'reject', 'escalate', 'remove_content', 'warn', 'suspend', 'ban']),
    reason: z.string().max(1000, 'Keep the reason under 1000 characters.').optional().default(''),
    days: z.union([z.string(), z.number()]).optional(),
    alsoRemove: z.boolean().optional().default(false),
  })
  .superRefine((value, ctx) => {
    if (NEEDS_REASON.includes(value.action) && !value.reason.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['reason'], message: 'A reason is required. The user will see it.' });
    }
    if (value.action === 'suspend') {
      const days = Number(value.days);
      if (!Number.isInteger(days) || days < 1 || days > MAX_SUSPENSION_DAYS) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['days'], message: `Enter 1 to ${MAX_SUSPENSION_DAYS} days.` });
      }
    }
  });

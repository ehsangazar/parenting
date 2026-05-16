import { z } from "zod";

export const checkoutSchema = z.object({
  priceId: z.string().min(1),
  tenantId: z.string().optional(),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

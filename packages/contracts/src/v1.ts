import { z } from "zod";

export const ArtworkSearchQuerySchema = z.object({
  q: z.string().trim().optional(),
  style: z.string().trim().optional(),
  color: z.string().trim().optional(),
  orientation: z.string().trim().optional(),
  edition: z.string().trim().optional(),
  availability: z.string().trim().optional(),
  minPrice: z.coerce.number().finite().nonnegative().optional(),
  maxPrice: z.coerce.number().finite().nonnegative().optional(),
});

export const CheckoutRequestSchema = z.object({
  shippingAddress: z.object({
    fullName: z.string().trim().min(1),
    address: z.string().trim().min(1),
    city: z.string().trim().min(1),
    phone: z.string().trim().min(1),
  }),
  method: z.enum(["card", "wallet"]).default("card"),
  simulateFailure: z.boolean().optional(),
});

export type ArtworkSearchQuery = z.infer<typeof ArtworkSearchQuerySchema>;
export type CheckoutRequest = z.infer<typeof CheckoutRequestSchema>;

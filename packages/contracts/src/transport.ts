import { z } from "zod";

export const CorrelationIdSchema = z.string().uuid();

export const PaginationQuerySchema = z.object({
  cursor: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().trim().min(1).optional(),
  direction: z.enum(["asc", "desc"]).default("asc"),
});

export const ApiErrorSchema = z.object({
  error: z.string().min(1),
  code: z.string().min(1).optional(),
  correlationId: CorrelationIdSchema.optional(),
});

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;

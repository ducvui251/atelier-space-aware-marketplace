import { z } from "zod";
import { CorrelationIdSchema } from "./transport.ts";

export const DomainEventTypeSchema = z.enum([
  "ArtworkPublished",
  "ArtworkVerified",
  "ArtworkSaved",
  "ArtistFollowed",
  "OrderCreated",
  "PaymentSucceeded",
  "OrderShipped",
  "ComplaintOpened",
]);

export const DomainEventSchema = z.object({
  id: z.string().uuid(),
  type: DomainEventTypeSchema,
  version: z.literal("v1"),
  occurredAt: z.string().datetime(),
  correlationId: CorrelationIdSchema,
  producer: z.string().min(1),
  payload: z.record(z.string(), z.unknown()),
});

export type DomainEvent = z.infer<typeof DomainEventSchema>;

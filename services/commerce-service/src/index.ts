import type { ServiceDefinition } from "@atelier/contracts";
export { orders, payments, shipments } from "./infrastructure/orders.ts";
export { reviews } from "./infrastructure/reviews.ts";
export { addToCart, getCart, removeFromCart } from "./application/cart.ts";
export { health } from "./health.ts";

export const COMMERCE_SERVICE: ServiceDefinition = {
  name: "commerce",
  version: "v1",
  owns: ["carts", "checkout", "orders", "payments"],
};

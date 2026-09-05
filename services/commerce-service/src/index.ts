import type { ServiceDefinition } from "@atelier/contracts";
export { orders, payments, shipments } from "./infrastructure/orders";
export { reviews } from "./infrastructure/reviews";
export { addToCart, getCart, removeFromCart } from "./application/cart";
export { createCheckout, type CheckoutResult } from "./application/checkout";
export { health } from "./health";

export const COMMERCE_SERVICE: ServiceDefinition = {
  name: "commerce",
  version: "v1",
  owns: ["carts", "checkout", "orders", "payments"],
};

// Delivery pipelines — must stay identical to the storefront
// (metallurg/src/lib/constants/order.ts) and the Telegram bot
// (tgBot-metallurg/bot/constants.py). `orders.current_status_index` is an
// index into one of these, chosen by `shipping_zone`.

export const LOCAL_ROUTE = [
  "ORDER_ACCEPTED",
  "PACKING",
  "READY_FOR_PICKUP",
  "HANDED_TO_RESIDENT",
] as const;

export const INTERNATIONAL_ROUTE = [
  "ORDER_ACCEPTED",
  "PROCESSING",
  "IN_TRANSIT_TO_HUB",
  "BORDER_CROSSING",
  "ARRIVED_IN_UKRAINE",
  "DELIVERED_TO_NP",
] as const;

export function routeFor(shippingZone: string): readonly string[] {
  return shippingZone === "Ukraine" ? LOCAL_ROUTE : INTERNATIONAL_ROUTE;
}

/** Clamp a stored index into the route (old rows may hold out-of-range values). */
export function clampStage(index: number, route: readonly string[]): number {
  if (!Number.isFinite(index) || index < 0) return 0;
  return Math.min(Math.floor(index), route.length - 1);
}

/** Normalise a contact / Telegram username for matching: "@Nik_S" → "nik_s". */
export function normaliseHandle(value: string | null | undefined): string {
  return (value ?? "").trim().replace(/^@/, "").toLowerCase();
}

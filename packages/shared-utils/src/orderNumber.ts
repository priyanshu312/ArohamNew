// The order number customers see and can track with: NAK- and the first 8 hex
// digits of the order's UUID. Mirrors orderNumber() in backend/routes/orders.js.
export function orderNumber(id: string | number | null | undefined): string {
  const hex = String(id ?? "").replace(/-/g, "").slice(0, 8).toUpperCase();
  return hex ? `NAK-${hex}` : "";
}

// services/validationService.js
// "Product Validation" block: check availability, price, quantity vs DB
const supabase = require("../config/supabase");

/**
 * items: [{ id, qty }]
 * Returns { valid, errors[], products[] } with server-side prices.
 */
async function validateItems(items) {
  const errors = [];
  if (!Array.isArray(items) || items.length === 0)
    return { valid: false, errors: ["Cart is empty"], products: [] };

  const ids = items.map((i) => i.id);
  const { data: products, error } = await supabase
    .from("products")
    .select("id, name, price, stock, emoji, is_active")
    .in("id", ids);

  if (error) return { valid: false, errors: [error.message], products: [] };

  const validated = [];
  for (const item of items) {
    const p = products.find((x) => x.id === item.id);
    if (!p) { errors.push(`Product ${item.id} not found`); continue; }
    // Taken off the shop, but a cart saved earlier can still hold it.
    if (!p.is_active) { errors.push(`${p.name} is no longer available`); continue; }
    if (!Number.isInteger(item.qty) || item.qty < 1) {
      errors.push(`Invalid quantity for ${p.name}`); continue;
    }
    if (p.stock < item.qty) {
      errors.push(`${p.name} is out of stock (only ${p.stock} left)`); continue;
    }
    // Always trust DB price, never the client's
    validated.push({ ...p, qty: item.qty, subtotal: p.price * item.qty });
  }

  return { valid: errors.length === 0, errors, products: validated };
}

module.exports = { validateItems };

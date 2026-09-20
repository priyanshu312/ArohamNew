// services/paymentService.js
// "4. PAYMENT" + "5. ORDER CONFIRMATION": verify signature, update statuses, stock
const crypto = require("crypto");
const supabase = require("../config/supabase");
const { ShiprocketService } = require("./shiprocket");
const { sendOrderConfirmation } = require("./notify");

function verifyPaymentSignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  // Say WHICH piece is missing. Lumping the server's own misconfiguration in
  // with a malformed request made a Razorpay auth failure look like a secret
  // that was never set, and sent a debugging session down the wrong path.
  const missing = [];
  if (!secret) missing.push("RAZORPAY_KEY_SECRET (server env)");
  if (!razorpay_order_id) missing.push("razorpay_order_id");
  if (!razorpay_payment_id) missing.push("razorpay_payment_id");
  if (!razorpay_signature) missing.push("razorpay_signature");
  if (missing.length) {
    console.error(`[Payments] Cannot verify payment signature — missing: ${missing.join(", ")}.`);
    return false;
  }
  const body = razorpay_order_id + "|" + razorpay_payment_id;
  const expected = crypto
    .createHmac("sha256", String(secret))
    .update(body).digest("hex");
  return expected === razorpay_signature;
}

function verifyWebhookSignature(rawBody, signature) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || rawBody == null || !signature) {
    console.error("[Payments] Cannot verify webhook signature — missing RAZORPAY_WEBHOOK_SECRET, body, or signature header.");
    return false;
  }
  const expected = crypto
    .createHmac("sha256", String(secret))
    .update(typeof rawBody === "string" ? rawBody : String(rawBody)).digest("hex");
  return expected === signature;
}

// SUCCESS path: payment SUCCESS → order CONFIRMED → reserved stock becomes sold → Shiprocket Integration
async function confirmOrder(orderId, paymentDetails) {
  // 0. Claim the order, exactly once.
  //
  // Two callers land here for the same payment: Razorpay's webhook and the
  // frontend's /payments/verify. The webhook usually wins by a few seconds and
  // the verify call used to run the WHOLE sequence again — sending a second
  // confirmation email and re-running the Shiprocket pipeline. The second AWB
  // request returns nothing because the shipment already has one, so the real
  // AWB was overwritten with null and the order read as unshipped.
  //
  // Stock survived this by luck, not design: commit_stock only does
  // `reserved = greatest(reserved - qty, 0)`, so the second pass was a no-op.
  //
  // A conditional UPDATE is the lock: Postgres lets exactly one of the two
  // callers match a row, whoever gets there first. The loser sees zero rows
  // and returns. Reading the status and then deciding would not be enough —
  // both could read PENDING before either writes.
  const { data: claimed, error: claimErr } = await supabase.from("orders")
    .update({ status: "CONFIRMED" })
    .eq("id", orderId)
    .in("status", ["PENDING", "PAYMENT_FAILED"])
    .select("id");

  if (claimErr) {
    console.error(`[Payments] Could not claim order #${orderId}: ${claimErr.message}`);
    return;
  }
  if (!claimed || claimed.length === 0) {
    console.log(`[Payments] confirmOrder skipped for #${orderId} — already confirmed by the other path (webhook/verify), or no such order.`);
    return;
  }

  // 1. Update payments table
  await supabase.from("payments")
    .update({ status: "SUCCESS", ...paymentDetails, paid_at: new Date().toISOString() })
    .eq("order_id", orderId);

  // 2. Fetch full order & items for Shiprocket
  const { data: order, error: orderErr } = await supabase.from("orders").select("*").eq("id", orderId).single();
  const { data: items, error: itemsErr } = await supabase.from("order_items").select("*").eq("order_id", orderId);

  if (orderErr) console.error("[Shiprocket Debug] Error fetching order:", orderErr.message);
  if (itemsErr) console.error("[Shiprocket Debug] Error fetching items:", itemsErr.message);

  // 3. Commit stock
  for (const it of items || []) {
    await supabase.rpc("commit_stock", { p_product_id: it.product_id, p_qty: it.qty });
  }

  // 3b. Order confirmation email (no-op unless RESEND_API_KEY + ORDER_EMAIL_FROM set).
  if (order) {
    sendOrderConfirmation(order, items).catch((e) =>
      console.warn("[notify] order confirmation email failed:", e.message)
    );
  }

  // 4. Shiprocket Fulfillment (gated by SHIPROCKET_ENABLED flag)
  const isShiprocketEnabled = process.env.SHIPROCKET_ENABLED === "true";
  const hasCredentials = !!(process.env.SHIPROCKET_EMAIL && process.env.SHIPROCKET_PASSWORD);

  if (!isShiprocketEnabled) {
    console.log(`[Shiprocket] Integration DISABLED (SHIPROCKET_ENABLED != "true"). Order #${orderId} confirmed without shipping automation.`);
    await supabase.from("orders").update({ status: "CONFIRMED" }).eq("id", orderId);
    return;
  }

  if (!hasCredentials) {
    console.warn(`[Shiprocket] ENABLED but credentials missing (SHIPROCKET_EMAIL / SHIPROCKET_PASSWORD). Skipping for Order #${orderId}.`);
    await supabase.from("orders").update({ status: "CONFIRMED" }).eq("id", orderId);
    return;
  }

  if (!order || !items) {
    console.error(`[Shiprocket] Order or items data missing for #${orderId}. Confirming without shipping.`);
    await supabase.from("orders").update({ status: "CONFIRMED" }).eq("id", orderId);
    return;
  }

  // 5. Trigger Shiprocket fulfillment pipeline
  console.log(`[Shiprocket] ENABLED. Triggering fulfillment for Order #${orderId}...`);
  try {
    const shiprocket = new ShiprocketService(process.env.SHIPROCKET_EMAIL, process.env.SHIPROCKET_PASSWORD);
    await shiprocket.initialize();

    const addr = order.address || {};
    // Normalize address field: checkout may send address_line1 or line1
    const addressLine = addr.address || addr.address_line1 || addr.line1 || "";
    // Normalize pincode: may come as pin or pincode
    const pincode = addr.pincode || addr.pin || "";
    // Normalize name
    const customerName = addr.name || addr.full_name || "Customer";

    const orderData = {
      order_id: order.id,
      customer_name: customerName,
      address: addressLine || "No address provided",
      city: addr.city || "Unknown",
      pincode: pincode || "000000",
      state: addr.state || addr.city || "Unknown",
      phone: addr.phone || "0000000000",
      email: addr.email || "noemail@example.com",
      pickup_location: process.env.SHIPROCKET_PICKUP_LOCATION || "warehouse",
      sub_total: order.amount / 100, // paise to INR
      items: items.map(i => ({
        name: i.name,
        sku: `SKU-${i.product_id}`,
        units: i.qty,
        selling_price: i.price / 100 // paise to INR
      }))
    };

    const result = await shiprocket.processFulfillment(orderData);
    
    // 6. Update order with shipping details
    if (result.success) {
      console.log(`[Shiprocket] Fulfillment SUCCESS for Order #${orderId}. Shipment: ${result.shipmentId}, AWB: ${result.awbData?.response?.data?.awb_code || "pending"}`);
      const { error: upErr } = await supabase.from("orders").update({
        status: "CONFIRMED",
        shipment_id: result.shipmentId,
        awb_code: result.awbData?.response?.data?.awb_code || null,
        label_url: result.labelUrl
      }).eq("id", orderId);
      // The shipping columns are added by supabase-schema.sql, but that file
      // uses `create table if not exists` — a database created before they were
      // added never got them. PostgREST then rejects the WHOLE update, so the
      // parcel ships while the order sits at PENDING forever. Retry with just
      // the status so the customer's order is at least correct.
      if (upErr) {
        console.error(`[Shiprocket] Could not persist shipping details for #${orderId}: ${upErr.message}. Falling back to status-only update — check that orders has shipment_id / awb_code / label_url.`);
        const { error: statusErr } = await supabase.from("orders").update({ status: "CONFIRMED" }).eq("id", orderId);
        if (statusErr) console.error(`[Shiprocket] Status-only update ALSO failed for #${orderId}: ${statusErr.message}`);
      }
    } else {
      console.error(`[Shiprocket] Fulfillment FAILED for Order #${orderId}:`, result.error);
      await supabase.from("orders").update({ status: "CONFIRMED" }).eq("id", orderId);
    }
  } catch (err) {
    console.error(`[Shiprocket] Integration error for Order #${orderId}:`, err.message);
    await supabase.from("orders").update({ status: "CONFIRMED" }).eq("id", orderId);
  }
}

// FAILURE path: payment FAILED → order PAYMENT_FAILED → release reserved stock
async function failOrder(orderId, reason) {
  // Never downgrade an order that has already been paid/confirmed — a stray or
  // replayed verify/webhook call with missing fields must not flip it back.
  const { data: existing } = await supabase.from("orders")
    .select("status").eq("id", orderId).maybeSingle();
  if (existing && (existing.status === "CONFIRMED" || existing.status === "SHIPPED" || existing.status === "DELIVERED")) {
    console.warn(`[Payments] failOrder skipped for #${orderId} — already ${existing.status}.`);
    return;
  }

  await supabase.from("payments")
    .update({ status: "FAILED", failure_reason: reason || "Payment failed" })
    .eq("order_id", orderId);
  await supabase.from("orders").update({ status: "PAYMENT_FAILED" }).eq("id", orderId);

  const { data: items } = await supabase.from("order_items")
    .select("product_id, qty").eq("order_id", orderId);
  for (const it of items || [])
    await supabase.rpc("release_stock", { p_product_id: it.product_id, p_qty: it.qty });
}

module.exports = { verifyPaymentSignature, verifyWebhookSignature, confirmOrder, failOrder };

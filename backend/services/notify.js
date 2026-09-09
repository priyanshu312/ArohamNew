// Transactional email — zero-dependency, provider-key-gated.
// Set RESEND_API_KEY + ORDER_EMAIL_FROM (e.g. "Nakshra <orders@yourdomain.com>")
// to turn it on. Without them every call is a silent no-op, so the order flow is
// never blocked by email config. Uses Resend's HTTP API
// (https://resend.com/docs/api-reference/emails/send-email); swap the endpoint
// for Brevo/Postmark/SES if you prefer — the shape is the same.
const RESEND_ENDPOINT = "https://api.resend.com/emails";

function inr(paise) {
  return "₹" + (Number(paise || 0) / 100).toLocaleString("en-IN");
}

async function sendEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ORDER_EMAIL_FROM;
  if (!apiKey || !from) {
    console.log(`[notify] email skipped (RESEND_API_KEY / ORDER_EMAIL_FROM unset) — would have sent "${subject}" to ${to}`);
    return { skipped: true };
  }
  if (!to) {
    console.warn("[notify] no recipient email — skipping:", subject);
    return { skipped: true };
  }
  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, html }),
    });
    if (!res.ok) {
      console.error(`[notify] email send failed ${res.status}:`, (await res.text()).slice(0, 300));
      return { ok: false };
    }
    return { ok: true };
  } catch (err) {
    console.error("[notify] email send error:", err.message);
    return { ok: false };
  }
}

// Called after an order is CONFIRMED. Fire-and-forget from the caller.
async function sendOrderConfirmation(order, items) {
  const to = order && order.address && order.address.email;
  const name = (order && order.address && order.address.name) || "Devotee";
  const rows = (items || [])
    .map(
      (it) =>
        `<tr><td style="padding:6px 12px">${it.name || "Sacred item"}</td>` +
        `<td style="padding:6px 12px;text-align:center">${it.qty}</td>` +
        `<td style="padding:6px 12px;text-align:right">${inr((it.price || 0) * (it.qty || 1))}</td></tr>`
    )
    .join("");
  const html = `
    <div style="font-family:Georgia,serif;max-width:520px;margin:auto;color:#241619">
      <h2 style="color:#7A2A30">Order confirmed \u{1FA94}</h2>
      <p>Namaste ${name}, your sacred order <b>#${String(order.id).slice(0, 8)}</b> is confirmed.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;font-family:system-ui,sans-serif;font-size:14px">
        <thead><tr style="border-bottom:1px solid #E8DBD2">
          <th style="padding:6px 12px;text-align:left">Item</th>
          <th style="padding:6px 12px">Qty</th>
          <th style="padding:6px 12px;text-align:right">Amount</th>
        </tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr style="border-top:1px solid #E8DBD2;font-weight:700">
          <td style="padding:8px 12px" colspan="2">Total</td>
          <td style="padding:8px 12px;text-align:right">${inr(order.amount)}</td>
        </tr></tfoot>
      </table>
      <p style="font-size:13px;color:#6E5A57">We'll email you again when it ships. \u{1F549}️ Nakshra</p>
    </div>`;
  return sendEmail({ to, subject: `Nakshra order #${String(order.id).slice(0, 8)} confirmed`, html });
}

// Login verification code. Fire from routes/auth via services/otp.
async function sendOtpEmail(to, code) {
  const html = `
    <div style="font-family:system-ui,Segoe UI,Roboto,sans-serif;max-width:440px;margin:auto;color:#241619">
      <h2 style="color:#7A2A30;margin:0 0 4px">Your Nakshra verification code</h2>
      <p style="margin:0 0 16px;color:#6E5A57">Enter this code to sign in. It expires in 10 minutes.</p>
      <div style="font-size:32px;letter-spacing:10px;font-weight:700;background:#F6EEE7;border:1px solid #E8DBD2;border-radius:12px;padding:18px 0;text-align:center;color:#241619">${code}</div>
      <p style="margin:16px 0 0;font-size:12px;color:#9A8A86">If you didn't request this, you can ignore this email. \u{1F549}️ Nakshra</p>
    </div>`;
  return sendEmail({ to, subject: `${code} is your Nakshra code`, html });
}

module.exports = { sendEmail, sendOrderConfirmation, sendOtpEmail };

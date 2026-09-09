// Transactional email — zero-dependency, provider-key-gated. Powers both the
// login OTP and order-confirmation mail. Without a key every call is a silent
// no-op, so those flows are never blocked by email config.
//
// Provider (first key present wins):
//   BREVO_API_KEY   -> Brevo  https://api.brevo.com/v3/smtp/email   (default choice)
//   RESEND_API_KEY  -> Resend https://api.resend.com/emails
// Plus ORDER_EMAIL_FROM, e.g.  "Nakshra <no-reply@nakshra.in>"  (or just the
// address). The sender must be a verified sender/domain in that provider.
const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";
const RESEND_ENDPOINT = "https://api.resend.com/emails";

function inr(paise) {
  return "₹" + (Number(paise || 0) / 100).toLocaleString("en-IN");
}

// "Nakshra <no-reply@nakshra.in>" -> { name: "Nakshra", email: "no-reply@nakshra.in" }
function parseFrom(raw) {
  const s = String(raw || "").trim();
  const m = s.match(/^\s*(.*?)\s*<\s*([^>]+?)\s*>\s*$/);
  if (m) return { name: (m[1] || "").replace(/^"|"$/g, "").trim() || "Nakshra", email: m[2] };
  return { name: "Nakshra", email: s };
}

async function sendEmail({ to, subject, html }) {
  const brevoKey = process.env.BREVO_API_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  const from = process.env.ORDER_EMAIL_FROM;
  const provider = brevoKey ? "brevo" : resendKey ? "resend" : null;

  if (!provider || !from) {
    console.log(`[notify] email skipped (no BREVO_API_KEY/RESEND_API_KEY or ORDER_EMAIL_FROM) — would have sent "${subject}" to ${to}`);
    return { skipped: true };
  }
  if (!to) {
    console.warn("[notify] no recipient email — skipping:", subject);
    return { skipped: true };
  }

  const sender = parseFrom(from);
  const req =
    provider === "brevo"
      ? {
          url: BREVO_ENDPOINT,
          headers: { "api-key": brevoKey, "Content-Type": "application/json", accept: "application/json" },
          body: { sender, to: [{ email: to }], subject, htmlContent: html },
        }
      : {
          url: RESEND_ENDPOINT,
          headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: { from: `${sender.name} <${sender.email}>`, to, subject, html },
        };

  try {
    const res = await fetch(req.url, { method: "POST", headers: req.headers, body: JSON.stringify(req.body) });
    if (!res.ok) {
      console.error(`[notify] ${provider} send failed ${res.status}:`, (await res.text()).slice(0, 300));
      return { ok: false };
    }
    return { ok: true };
  } catch (err) {
    console.error(`[notify] ${provider} send error:`, err.message);
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

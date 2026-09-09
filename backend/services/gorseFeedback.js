// Fire-and-forget behavioural feedback to Gorse so the recommender learns from
// real activity. Never awaited, never throws — a missing/unreachable Gorse just
// logs a warning. Feedback-type strings must match config.toml:
//   view -> "view_product" (sent by routes/telemetry.js)
//   add to cart -> "like"
//   purchase -> "buy"
const gorseUrl = () => process.env.GORSE_URL || "http://localhost:8088";

function sendFeedback(feedbackType, userId, productIds) {
  if (!userId || productIds == null) return;
  const ids = (Array.isArray(productIds) ? productIds : [productIds])
    .filter((v) => v !== undefined && v !== null && v !== "");
  if (ids.length === 0) return;

  const body = JSON.stringify(
    ids.map((id) => ({
      FeedbackType: feedbackType,
      UserId: String(userId),
      ItemId: String(id),
      Timestamp: new Date().toISOString(),
    }))
  );

  // Fire and forget — do not block the caller's response.
  fetch(`${gorseUrl()}/api/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  }).catch((err) =>
    console.warn(`[Gorse] ${feedbackType} feedback dropped:`, err.message)
  );
}

module.exports = { sendFeedback };

// routes/telemetry.js — anonymous behavioural signals from the storefront.
// Both endpoints just forward to Gorse via the shared fire-and-forget helper,
// which coerces UserId/ItemId to strings (Gorse rejects numeric ids with
// "cannot unmarshal number into ... ItemId of type string" and the old inline
// fetch swallowed that, so clicks never actually reached the recommender).
const router = require("express").Router();
const { sendFeedback } = require("../services/gorseFeedback");

// POST /api/telemetry/click  { userId, productId }  — product impression / view
router.post("/click", (req, res) => {
  const { userId, productId } = req.body;
  if (!userId || !productId) {
    return res.status(400).json({ error: "userId and productId are required" });
  }
  sendFeedback("view_product", userId, productId);
  res.json({ success: true });
});

// POST /api/telemetry/event  { userId, productId, eventType }
router.post("/event", (req, res) => {
  const { userId, productId, eventType = "view_product" } = req.body;
  if (!userId || !productId) {
    return res.status(400).json({ error: "userId and productId are required" });
  }
  sendFeedback(eventType, userId, productId);
  res.json({ success: true });
});

module.exports = router;

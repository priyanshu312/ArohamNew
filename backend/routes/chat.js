const router = require("express").Router();
const supabase = require("../config/supabase");

// Helper to format google drive images (same as products.js)
function formatImageUrl(url) {
  if (!url || typeof url !== "string") return url;
  const driveMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (driveMatch && driveMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${driveMatch[1]}`;
  }
  return url;
}

router.post("/", async (req, res) => {
  const { message, userId, pageContext, history = [] } = req.body;
  if (!message) {
    return res.status(400).json({ error: "message is required" });
  }

  const GORSE_URL = process.env.GORSE_URL || "http://localhost:8088";
  let recommendedProducts = [];

  try {
    // 1. Fetch recommendations from Gorse
    const gorseRes = await fetch(`${GORSE_URL}/api/recommend/${userId}?n=3`);
    if (gorseRes.ok) {
      const itemIds = await gorseRes.json();
      if (itemIds && itemIds.length > 0) {
        // 2. Query Supabase for product details
        const { data: dbProducts } = await supabase
          .from("products")
          .select("*")
          .in("id", itemIds);

        if (dbProducts) {
          recommendedProducts = dbProducts.map(p => ({
            id: p.id,
            slug: p.slug || String(p.id),
            name: p.name,
            img: formatImageUrl(p.img),
            desc: p.short_desc || p.subtitle || "Vedic remedial tool",
            price: `₹${(p.price / 100).toFixed(2)}`,
            raw_price: p.price
          }));
        }
      }
    }
  } catch (err) {
    console.error("[Chat API Gorse Error]:", err.message);
  }

  // 3. Inject refined Nakshra System Prompt
  let systemPrompt = `You are Nakshra's Sacred AI AstroGuide — an empathetic, deeply knowledgeable Vedic astrological advisor.
Your role is to offer warm, uplifting, non-deterministic astrological insights and sacred remedy recommendations.

Key Instructions:
1. GREETING & TONE: Begin with a gentle, warm greeting like "Namaste" or "Hari Om". Speak with warmth, wisdom, and respect.
2. NO GUARANTEES OR DOOM: Never make deterministic claims like "100% guarantees wealth" or predict health/life emergencies. Reframe remedies as supportive spiritual tools that align positive cosmic energies.
3. SACRED TERMINOLOGY: Refer to remedies as "temple-energized", "Vedic remedies", and "blessed tools for spiritual harmony".
4. STRUCTURING: Keep paragraphs short, clear, and easy to read. Use bullet points where appropriate.`;

  if (pageContext) {
    systemPrompt += `\n\n5. PAGE CONTEXT: The user is currently viewing the page at "${pageContext}". If this is a specific product page, factor this context into your response as they might be asking about it.`;
  }

  if (recommendedProducts.length > 0) {
    const productText = recommendedProducts.map(p => `- Name: ${p.name}, Price: ${p.price}, Description: ${p.desc}`).join("\n");
    systemPrompt += `\n\nOur Machine Learning engine recommends these sacred store items for this devotee:\n${productText}\n\nYou MUST naturally weave a recommendation for 1 or 2 of these items into your guidance. Dedicate a section titled "💎 Recommended Sacred Remedies" at the bottom of your message, format the product name in bold, explain why it supports them, and mention it is available in the Nakshra Store.`;
  }

  const userProfile = global.kundaliProfiles ? global.kundaliProfiles[userId] : null;
  if (userProfile) {
    systemPrompt += `\n\n6. ASTROLOGICAL PROFILE: This devotee's active Mahadasha is ${userProfile.mahadasha} (Moon Sign: ${userProfile.moonSign}, Nakshatra: ${userProfile.nakshatra}). ${userProfile.guidanceNote}`;
  }

  // 4. Call Groq using native fetch
  try {
    const model = process.env.LLM_MODEL || "llama-3.3-70b-versatile";
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "system", content: systemPrompt },
          ...history.map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text })),
          { role: "user", content: message }
        ],
        temperature: 0.7
      })
    });

    if (!groqRes.ok) {
      throw new Error(`Groq API returned status ${groqRes.status}`);
    }

    const data = await groqRes.json();
    const reply = data.choices[0]?.message?.content || "I'm having trouble connecting to the cosmos right now.";

    // Detect if conversation touches birth charts, Kundali, or personal live consultations
    const lowerMsg = (message || "").toLowerCase();
    const lowerReply = (reply || "").toLowerCase();
    const isConsultationTopic = 
      lowerMsg.includes("kundali") || lowerMsg.includes("birth chart") || lowerMsg.includes("astrologer") ||
      lowerMsg.includes("horoscope") || lowerMsg.includes("dasha") || lowerMsg.includes("matchmaking") ||
      lowerReply.includes("astrologer") || lowerReply.includes("kundali");

    res.json({
      reply,
      recommendations_injected: recommendedProducts.length > 0,
      products: recommendedProducts,
      consultation_handoff: isConsultationTopic
    });
  } catch (err) {
    console.error("[Chat API Groq Error]:", err.message);
    res.status(500).json({ error: "Failed to generate chatbot response", details: err.message });
  }
});

module.exports = router;

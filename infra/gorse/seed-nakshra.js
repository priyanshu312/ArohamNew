/**
 * Reset + seed Gorse with the REAL Nakshra catalog (numeric Supabase product IDs)
 * plus synthetic feedback so the collaborative model has something to learn from
 * until real user events start flowing in.
 *
 *   node seed-nakshra.js
 *
 * Safe to re-run — it truncates Gorse's tables and Redis cache first.
 */
const { execSync } = require("child_process");

const GORSE_URL = process.env.GORSE_URL || "http://localhost:8088";
const SUPABASE_URL = process.env.SUPABASE_URL || "https://lzzdfsphevmzbkkoskxb.supabase.co";
// Publishable/anon key — safe to ship (same one the web bundle uses). Override via env.
const SUPABASE_ANON =
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6emRmc3BoZXZtemJra29za3hiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxNDcwMjIsImV4cCI6MjA5ODcyMzAyMn0.Z1zWIvp2kNg-Z9OwUmJrAVDPF_DQkiCqM5YmG5GD9TY";

const NUM_USERS = 200;
const rnd = (n) => Math.floor(Math.random() * n);
const pick = (arr) => arr[rnd(arr.length)];
const shuffle = (a) => a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map((x) => x[1]);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function wipe() {
  console.log("• Truncating Gorse tables + flushing Redis…");
  execSync(
    `docker exec gorse-setup-postgres-1 psql -U gorse -d gorse -c "TRUNCATE feedback, items, users;"`,
    { stdio: "inherit" }
  );
  execSync(`docker exec gorse-setup-redis-1 redis-cli FLUSHALL`, { stdio: "inherit" });
  // FLUSHALL drops Gorse's RediSearch "documents" index; it is only (re)created
  // on startup, so restart Gorse before pushing data back in.
  console.log("• Restarting Gorse to rebuild its Redis search index…");
  execSync(`docker restart gorse-setup-gorse-1`, { stdio: "inherit" });
  await sleep(9000);
}

async function fetchProducts() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/products?select=id,slug,name,category,purpose,badges,rating,reviews&order=id`,
    { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` } }
  );
  if (!res.ok) throw new Error(`Supabase products fetch failed: ${res.status} ${await res.text()}`);
  return res.json();
}

function labelsFor(p) {
  const words = new Set();
  if (p.category) words.add(String(p.category).toLowerCase().replace(/\s+/g, "-"));
  if (p.purpose) words.add(String(p.purpose).toLowerCase().replace(/\s+/g, "-"));
  for (const b of p.badges || []) words.add(String(b).toLowerCase().replace(/\s+/g, "-"));
  return [...words];
}

async function pushItems(products) {
  const items = products.map((p) => ({
    ItemId: String(p.id),
    IsHidden: false,
    Labels: labelsFor(p),
    Categories: [String(p.category || "general").toLowerCase().replace(/\s+/g, "-")],
    Timestamp: new Date().toISOString(),
    Comment: p.name,
  }));
  const res = await fetch(`${GORSE_URL}/api/items`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(items),
  });
  console.log(`• Pushed ${items.length} items:`, await res.text());
}

async function pushUsersAndFeedback(products) {
  const byCat = {};
  for (const p of products) {
    const c = p.category || "general";
    (byCat[c] = byCat[c] || []).push(String(p.id));
  }
  const cats = Object.keys(byCat);
  const allIds = products.map((p) => String(p.id));

  const users = [];
  const feedback = [];
  const now = Date.now();

  for (let i = 0; i < NUM_USERS; i++) {
    const uid = `seed_user_${i}`;
    const favCat = pick(cats);
    users.push({ UserId: uid, Labels: [favCat.toLowerCase().replace(/\s+/g, "-")], Subscribe: [], Comment: "synthetic seed user" });

    // 3–6 items browsed from the favourite category, 1–3 from anywhere (noise)
    const inCat = shuffle(byCat[favCat]).slice(0, 3 + rnd(4));
    const outCat = shuffle(allIds).slice(0, 1 + rnd(3));
    const viewed = [...new Set([...inCat, ...outCat])];

    for (const itemId of viewed) {
      const ts = new Date(now - rnd(60) * 86400000).toISOString();
      feedback.push({ FeedbackType: "read", UserId: uid, ItemId: itemId, Timestamp: ts });
      // Likes mostly on in-category items
      if (inCat.includes(itemId) && Math.random() < 0.7) {
        feedback.push({ FeedbackType: "like", UserId: uid, ItemId: itemId, Timestamp: ts });
      }
      // A purchase or two, in-category
      if (inCat.includes(itemId) && Math.random() < 0.35) {
        feedback.push({ FeedbackType: "buy", UserId: uid, ItemId: itemId, Timestamp: ts });
      }
    }
  }

  let r = await fetch(`${GORSE_URL}/api/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(users),
  });
  console.log(`• Pushed ${users.length} users:`, await r.text());

  // Gorse caps batch size; chunk the feedback
  for (let i = 0; i < feedback.length; i += 1000) {
    const chunk = feedback.slice(i, i + 1000);
    r = await fetch(`${GORSE_URL}/api/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(chunk),
    });
    process.stdout.write(`  feedback ${i + chunk.length}/${feedback.length} -> ${(await r.text()).trim()}\n`);
  }
  console.log(`• Total feedback events: ${feedback.length}`);
}

(async () => {
  await wipe();
  const products = await fetchProducts();
  console.log(`• Supabase catalog: ${products.length} products`);
  await pushItems(products);
  await pushUsersAndFeedback(products);
  console.log("\n✅ Seed done. Gorse will fit the collaborative model on its next cycle");
  console.log("   (fit_period = 5m). Force it now with:  docker restart gorse-setup-gorse-1");
})();

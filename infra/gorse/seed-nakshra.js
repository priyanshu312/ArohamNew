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
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_ANON) {
  console.error("Set SUPABASE_URL and SUPABASE_ANON_KEY in the environment before running this seed script.");
  process.exit(1);
}

const NUM_USERS = 200;
const rnd = (n) => Math.floor(Math.random() * n);
const pick = (arr) => arr[rnd(arr.length)];
const shuffle = (a) => a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map((x) => x[1]);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const IS_LOCAL = /localhost|127\.0\.0\.1/.test(GORSE_URL);

async function wipe() {
  if (!IS_LOCAL) {
    // Hosted Gorse (e.g. Render) — no local docker containers to reach, and a
    // freshly-provisioned Postgres starts empty. Just (best-effort) clear items
    // via the API so re-runs don't pile up duplicates.
    console.log(`• Remote target ${GORSE_URL} — skipping docker truncate.`);
    return;
  }
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

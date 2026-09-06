import { NakshraProduct } from "@nakshra/shared-types/product";
import { GOLD, MAROON } from "./theme";

const baglaImg       = "https://cdn.shopify.com/s/files/1/0878/4907/4985/files/1_a144e37f-680e-430f-80bd-e7c35b9d2ebb.webp?v=1759924225";
const pendantSilImg  = "https://cdn.shopify.com/s/files/1/0878/4907/4985/files/Artboard1_19.webp?v=1782733204";
const pyramidImg     = "https://cdn.shopify.com/s/files/1/0878/4907/4985/files/Artboard1_18.webp?v=1782199970";
const yantraPlateImg = "https://cdn.shopify.com/s/files/1/0878/4907/4985/files/1_23.jpg?v=1782120393";
const gemstonImg     = "https://cdn.shopify.com/s/files/1/0878/4907/4985/files/1-2026-06-19T175355.300.webp?v=1781871863";
const navratnaImg    = "https://cdn.shopify.com/s/files/1/0878/4907/4985/files/1-1_f53e2d9e-40a0-4f0e-95a9-8d6a878b2f77.webp?v=1781163169";

export { baglaImg, pendantSilImg, pyramidImg, yantraPlateImg, gemstonImg, navratnaImg };



export const COMBOS = [
  {
    name: "Navagraha Complete Kit",
    desc: "Align all 9 planetary energies for total life transformation",
    items: ["Love & Money Metal Bracelet", "Citrine Sun Ring", "Bagla Mukhi Yantra"],
    price: 6999, original: 11497, saving: 4498,
    color: "linear-gradient(135deg,#2D1B00,#5B3800)",
    accent: GOLD,
  },
  {
    name: "Wealth Attraction Kit",
    desc: "Triple-layer wealth activation for financial breakthroughs",
    items: ["Citrine Sun Ring", "Nepal Origin 1 Mukhi Rudraksha", "Bagla Mukhi Yantra"],
    price: 5499, original: 7997, saving: 2498,
    color: "linear-gradient(135deg,#0D2B1A,#1A4D2E)",
    accent: "#4ADE80",
  },
  {
    name: "Home Protection Bundle",
    desc: "Complete Vastu correction & divine protection for your home",
    items: ["Nepal Origin 1 Mukhi Rudraksha", "Pyrite Sun Ring", "Dhan Yog Necklace"],
    price: 5999, original: 8697, saving: 2698,
    color: "linear-gradient(135deg,#1A0D30,#2D1A50)",
    accent: "#A78BFA",
  },
];

export interface Graha {
  name: string;
  en?: string;
  color: string;
  size: number;
  orbit: number;
  speed: number;
  gem: string;
  desc: string;
}

export const GRAHAS: Graha[] = [
  { name: "Surya", en: "Sun",     color: "#FFD700", size: 48, orbit: 0,   speed: 0,    gem: "Ruby",     desc: "Soul, authority, health" },
  { name: "Chandra", en: "Moon",  color: "#E8E8FF", size: 14, orbit: 90,  speed: 8,    gem: "Pearl",    desc: "Mind, emotions, nurture" },
  { name: "Mangal", en: "Mars",   color: "#FF4444", size: 16, orbit: 130, speed: 14,   gem: "Coral",    desc: "Energy, courage, strength" },
  { name: "Budha", en: "Mercury", color: "#90EE90", size: 13, orbit: 165, speed: 10,   gem: "Emerald",  desc: "Intellect, communication" },
  { name: "Guru", en: "Jupiter",  color: "#FFB347", size: 22, orbit: 205, speed: 22,   gem: "Yellow Sapphire", desc: "Wisdom, expansion, luck" },
  { name: "Shukra", en: "Venus",  color: "#FFB6C1", size: 18, orbit: 248, speed: 16,   gem: "Diamond",  desc: "Love, beauty, luxury" },
  { name: "Shani", en: "Saturn",  color: "#B8A090", size: 20, orbit: 295, speed: 30,   gem: "Blue Sapphire", desc: "Discipline, karma, justice" },
  { name: "Rahu",                  color: "#6644AA", size: 15, orbit: 338, speed: 18,   gem: "Hessonite", desc: "Desire, illusion, foreign" },
  { name: "Ketu",                  color: "#AA6644", size: 15, orbit: 375, speed: 20,   gem: "Cat's Eye", desc: "Liberation, mysticism" },
];

export const CRAFT_STEPS = [
  { icon: "⛏", title: "Sacred Material Sourcing", desc: "We source only auspicious metals — copper, brass, and silver — from trusted artisan cooperatives, chosen on Vedic-auspicious dates.", color: "#8B4513" },
  { icon: "🔨", title: "Master Artisan Crafting", desc: "Skilled craftspeople with decades of experience shape each piece by hand using traditional tools, preserving centuries-old techniques.", color: MAROON },
  { icon: "✍", title: "Sanskrit Inscription", desc: "Vedic pandits inscribe sacred mantras and geometric yantras with millimeter precision, each stroke charged with spiritual intent.", color: "#2D4A8B" },
  { icon: "🪔", title: "Temple Energization (Pran Pratishtha)", desc: "Every product undergoes a full Pran Pratishtha ritual at a certified temple. Mantras are chanted for 108 rounds, activating divine energy.", color: "#8B6914" },
  { icon: "📜", title: "Certification & Dispatch", desc: "A Vedic quality inspector certifies the product. It is then wrapped in premium packaging and dispatched with a certificate of authenticity.", color: "#2D5A2D" },
];

export const CRAFT_IMAGES = [baglaImg, yantraPlateImg, navratnaImg, pyramidImg, navratnaImg];

export const PROBLEMS_DATA = [
  { emoji: "💰", label: "Wealth & Money",      desc: "Attract financial abundance",  bg: "linear-gradient(135deg,#2D1B00,#5B3800)", img: baglaImg },
  { emoji: "❤️", label: "Love & Relationships", desc: "Strengthen bonds",             bg: "linear-gradient(135deg,#3A0D1A,#6B1A30)", img: navratnaImg },
  { emoji: "🛡",  label: "Protection",          desc: "Shield from negativity",       bg: "linear-gradient(135deg,#0D1A2D,#1A3050)", img: pendantSilImg },
  { emoji: "🏡",  label: "Home Harmony",        desc: "Balance Vastu energies",       bg: "linear-gradient(135deg,#0D2D15,#1A5025)", img: pyramidImg },
  { emoji: "💼",  label: "Career Growth",       desc: "Success & recognition",        bg: "linear-gradient(135deg,#1A0D2D,#351A55)", img: yantraPlateImg },
  { emoji: "🧘",  label: "Peace of Mind",       desc: "Clarity & inner calm",         bg: "linear-gradient(135deg,#0D2020,#1A4040)", img: gemstonImg },
];

export const FEAT_CATS = [
  { name: "Yantras",    desc: "Sacred geometric diagrams for manifestation",  img: baglaImg,    count: 48 },
  { name: "Pendants",   desc: "Wearable protection & cosmic alignment",       img: navratnaImg, count: 32 },
  { name: "Crystals",   desc: "Natural gemstones charged with earth energy",  img: gemstonImg,  count: 27 },
  { name: "Vastu Kits", desc: "Complete remedies for home & office harmony",  img: pyramidImg,  count: 19 },
];

export const VIDEO_REVIEWS = [
  { name: "Sunita Rao",   city: "Hyderabad",         product: "Citrine Sun Ring",      rating: 5, thumb: navratnaImg,   init: "SR", bg: "#2D4A8B", duration: "1:24", review: "The ring arrived beautifully packaged. I wore it during my important business meeting and things turned around completely." },
  { name: "Rahul Verma",  city: "Pune",              product: "Nepal Origin 1 Mukhi Rudraksha",  rating: 5, thumb: pyramidImg,    init: "RV", bg: "#5B1F24", duration: "2:08", review: "Wore it exactly as instructed. The energy in my office changed noticeably within two weeks. Absolutely worth it." },
  { name: "Meera Iyer",   city: "Chennai",           product: "Bagla Mukhi Yantra",    rating: 5, thumb: baglaImg,      init: "MI", bg: "#4A3728", duration: "0:58", review: "My court case was pending for years. After installing this yantra, it resolved in 3 months. I am a believer now." },
];

export const COMMENTS_DATA = [
  { name: "Arjun Mehta",   city: "Bangalore", rating: 5, text: "The Nepal Origin 1 Mukhi Rudraksha is museum-quality. The energization certificate and the care in packaging shows Nakshra treats each product as sacred — not just a commodity.", product: "Nepal Origin 1 Mukhi Rudraksha", init: "AM", bg: "#8B4513", likes: 24, date: "2 weeks ago" },
  { name: "Priya Sharma",  city: "Mumbai",    rating: 5, text: "Received my Citrine Sun Ring within 3 days. The packaging was exquisite and the certificate of authenticity gave me full confidence. I can feel the energy!", product: "Citrine Sun Ring", init: "PS", bg: MAROON, likes: 31, date: "1 month ago" },
  { name: "Kavya Nair",    city: "Kochi",     rating: 5, text: "Finally a platform that treats Vedic products with the reverence they deserve. Customer support was phenomenal when I had questions about placement.", product: "Pyrite Sun Ring", init: "KN", bg: "#2D5A2D", likes: 18, date: "3 weeks ago" },
  { name: "Deepak Sharma", city: "Jaipur",    rating: 5, text: "The Bagla Mukhi Yantra is incredibly well-crafted. Gold finish is perfect and the engravings are sharp. This is clearly made by expert artisans.", product: "Bagla Mukhi Yantra", init: "DS", bg: "#2D4A8B", likes: 15, date: "1 week ago" },
  { name: "Anjali Patel",  city: "Ahmedabad", rating: 4, text: "Very good quality products. Shipping was a bit delayed but the team kept me updated. Overall a trustworthy platform for authentic Vedic items.", product: "Love & Money Metal Bracelet", init: "AP", bg: "#5A3A28", likes: 9, date: "2 months ago" },
  { name: "Vikram Nair",   city: "Kochi",     rating: 5, text: "I was sceptical about online purchase of sacred items. But Nakshra changed my mind. The Pran Pratishtha certificate is a genuine differentiator.", product: "Dhan Yog Necklace", init: "VN", bg: "#3A5A3A", likes: 22, date: "5 days ago" },
];

export const CATEGORIES = ["Yantra", "Pendant", "Crystals", "Bracelet", "Rudraksha"];
export const PURPOSES = ["Wealth", "Love", "Protection", "Peace", "Career", "Health", "Home Harmony"];
export const PRICE_RANGES = [
  { label: "Under ₹1,000", min: 0, max: 1000 },
  { label: "₹1,000 – ₹3,000", min: 1000, max: 3000 },
  { label: "₹3,000+", min: 3000, max: Infinity },
];

export const INDIA_STATES = [
  "Andhra Pradesh","Assam","Bihar","Chandigarh","Delhi","Goa","Gujarat","Haryana",
  "Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra",
  "Manipur","Meghalaya","Odisha","Punjab","Rajasthan","Tamil Nadu","Telangana",
  "Uttar Pradesh","Uttarakhand","West Bengal"
];

export const SAVED_ADDRESSES = [
  { id: 1, type: "Home",    name: "Priya Sharma",  phone: "+91 98765 43210", line1: "Flat 4B, Sunrise Residency, Sector 12",    city: "Mumbai", state: "Maharashtra", pin: "400076", isDefault: true  },
  { id: 2, type: "Office",  name: "Priya Sharma",  phone: "+91 98765 43210", line1: "WeWork, Bandra Kurla Complex, Floor 8",     city: "Mumbai", state: "Maharashtra", pin: "400051", isDefault: false },
  { id: 3, type: "Parents", name: "S. K. Sharma",  phone: "+91 94561 78902", line1: "12 Shanti Nagar, Near Ram Mandir",          city: "Jaipur", state: "Rajasthan",   pin: "302001", isDefault: false },
];

export const UPI_APPS = [
  { name: "Google Pay", icon: "G", color: "#4285F4" },
  { name: "PhonePe",    icon: "P", color: "#5F259F" },
  { name: "Paytm",      icon: "₱", color: "#00BAF2" },
  { name: "BHIM",       icon: "B", color: "#00529B" },
  { name: "Amazon Pay", icon: "A", color: "#FF9900" },
];

export const BANKS_DATA = [
  { name: "HDFC Bank",     code: "HDFC"  },
  { name: "ICICI Bank",    code: "ICICI" },
  { name: "SBI",           code: "SBI"   },
  { name: "Axis Bank",     code: "AXIS"  },
  { name: "Kotak",         code: "KOTAK" },
  { name: "Yes Bank",      code: "YES"   },
  { name: "PNB",           code: "PNB"   },
  { name: "Bank of Baroda",code: "BOB"   },
];

export const WALLETS_DATA = [
  { name: "Amazon Pay",  icon: "A", color: "#FF9900" },
  { name: "PhonePe",     icon: "P", color: "#5F259F" },
  { name: "Paytm Wallet",icon: "₱", color: "#00BAF2" },
  { name: "Mobikwik",    icon: "M", color: "#FF5722" },
];

export const EMI_PLANS = [
  { months: 3,  per: "₹1,979/mo", interest: "No cost"   },
  { months: 6,  per: "₹1,002/mo", interest: "No cost"   },
  { months: 9,  per: "₹681/mo",   interest: "1.5% p.a." },
  { months: 12, per: "₹517/mo",   interest: "2% p.a."   },
];

export const ORDER_NUMBER = "ARH-2025-084719";

export const MOCK_ORDERS = [
  { id: "ARH-2025-084719", date: "12 Jul 2025", status: "Delivered", statusColor: "#4A8A4A", total: 5348, items: "Citrine Sun Ring",  thumb: navratnaImg  },
  { id: "ARH-2025-071203", date: "03 Jun 2025", status: "Delivered", statusColor: "#4A8A4A", total: 2999, items: "Bagla Mukhi Yantra",      thumb: baglaImg      },
  { id: "ARH-2025-058841", date: "18 Apr 2025", status: "Delivered", statusColor: "#4A8A4A", total: 1899, items: "Dhan Yog Necklace",         thumb: pendantSilImg },
];

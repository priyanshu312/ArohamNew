export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  category: "Vedic Astrology" | "Rudraksha Remedies" | "Gemstones" | "Vastu Wisdom" | "Rituals & Pujas";
  readTime: string;
  date: string;
  author: {
    name: string;
    role: string;
    avatar: string;
  };
  coverImage: string;
  excerpt: string;
  content: string[];
  keyTakeaway: string;
  recommendedProduct?: {
    title: string;
    price: number;
    originalPrice?: number;
    image: string;
    slug: string;
    badge?: string;
  };
}

export const BLOG_POSTS: BlogPost[] = [
  {
    id: "1",
    title: "Nepal Origin 5 Mukhi Rudraksha Bead: Unlock Health, Peace & Divine Shiva Blessings",
    slug: "nepal-origin-5-mukhi-rudraksha-bead-guide",
    category: "Rudraksha Remedies",
    readTime: "6 min read",
    date: "July 26, 2026",
    author: {
      name: "Acharya Pandit Devdutt",
      role: "Head Vedic Scholar & Jyotish",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200"
    },
    coverImage: "https://cdn.shopify.com/s/files/1/0878/4907/4985/files/1_a144e37f-680e-430f-80bd-e7c35b9d2ebb.webp?v=1759924225",
    excerpt: "The Nepal Origin 5 Mukhi Rudraksha is celebrated across ancient scriptures as the ultimate bead for health, mental clarity, and protection from negative planetary influences.",
    content: [
      "The holy 5 Mukhi Rudraksha bead represents Lord Kalagni Rudra. It regulates blood pressure, enhances mental focus, and calms the nervous system through natural electromagnetic resonance.",
      "Each Mukhi bead in Nakshra's store is 100% lab-certified Nepalese origin and consecrated with 108 mantra chanting rounds by expert pandits prior to dispatch.",
      "Wearing this bead around your neck or in a silver casing brings profound spiritual alignment and shields the wearer from sudden misfortunes."
    ],
    keyTakeaway: "Always ensure your Rudraksha is lab-certified Nepalese origin and fully mantra-energized to experience genuine spiritual benefits.",
    recommendedProduct: {
      title: "Nepal Origin 5 Mukhi Rudraksha Bead - 8mm to 12mm (FREE GIFT)",
      price: 100,
      originalPrice: 120,
      image: "https://cdn.shopify.com/s/files/1/0878/4907/4985/files/1_a144e37f-680e-430f-80bd-e7c35b9d2ebb.webp?v=1759924225",
      slug: "nepal-origin-5-mukhi-rudraksha-bead",
      badge: "AUTHENTIC & ENERGIZED"
    }
  },
  {
    id: "2",
    title: "Grah Shanti Yantra with Black Tourmaline Frame: Neutralizing Planetary Afflictions at Home",
    slug: "grah-shanti-yantra-black-tourmaline-guide",
    category: "Vastu Wisdom",
    readTime: "5 min read",
    date: "July 24, 2026",
    author: {
      name: "Dr. Ananya Sharma",
      role: "Senior Vastu & Sacred Geometry Consultant",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200"
    },
    coverImage: "https://cdn.shopify.com/s/files/1/0878/4907/4985/files/1_23.jpg?v=1782120393",
    excerpt: "Discover how combining 24k gold-plated Navagraha Yantra geometry with natural Black Tourmaline stone creates an impenetrable shield against evil eye and Graha Doshas.",
    content: [
      "The Grah Shanti Yantra harmonizes all 9 celestial planets (Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu, and Ketu) in your living or working space.",
      "Enclosed within a premium natural Black Tourmaline stone frame, it actively absorbs environmental electromagnetic pollution and negative energy bursts.",
      "Place this Yantra in your home altar or entrance facing North-East to ensure ongoing harmony, family health, and financial growth."
    ],
    keyTakeaway: "Combine sacred geometric Yantras with grounding stones like Black Tourmaline for double protection against planetary doshas.",
    recommendedProduct: {
      title: "Grah Shanti Yantra with Black Tourmaline Frame",
      price: 999,
      originalPrice: 1199,
      image: "https://cdn.shopify.com/s/files/1/0878/4907/4985/files/1_23.jpg?v=1782120393",
      slug: "grah-shanti-yantra-black-tourmaline-frame",
      badge: "AUTHENTIC"
    }
  },
  {
    id: "3",
    title: "Dhan Yog Necklace & Couple Bracelets: Attracting Wealth, Prosperity & Relationship Harmony",
    slug: "dhan-yog-necklace-wealth-attraction",
    category: "Gemstones",
    readTime: "7 min read",
    date: "July 21, 2026",
    author: {
      name: "Vaidya Rajesh Shastri",
      role: "Vedic Gemologist & Astro-Consultant",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200"
    },
    coverImage: "https://cdn.shopify.com/s/files/1/0878/4907/4985/files/1-1_f53e2d9e-40a0-4f0e-95a9-8d6a878b2f77.webp?v=1781163169",
    excerpt: "Unpack the planetary energy of Pyrite, Citrine, and Green Aventurine crystals designed to manifest money flow and emotional bonding.",
    content: [
      "The Dhan Yog series combines high-frequency abundance crystals set in delicate gold and silver wiring. It stimulates the solar plexus and heart chakras.",
      "Wearing the Dhan Yog Necklace daily elevates your aura, attracting unexpected career opportunities and fostering deep trust in interpersonal relationships."
    ],
    keyTakeaway: "Crystals aligned with Lakshmi and Kuber mantras accelerate wealth creation when worn continuously on clean skin.",
    recommendedProduct: {
      title: "Dhan Yog Necklace",
      price: 999,
      originalPrice: 1199,
      image: "https://cdn.shopify.com/s/files/1/0878/4907/4985/files/1-1_f53e2d9e-40a0-4f0e-95a9-8d6a878b2f77.webp?v=1781163169",
      slug: "dhan-yog-necklace",
      badge: "AUTHENTIC"
    }
  },
  {
    id: "4",
    title: "Khatu Shyam Murti with Glass Dome: Invoking Devotion, Peace & Miraculous Protection",
    slug: "khatu-shyam-murti-glass-dome-guide",
    category: "Rituals & Pujas",
    readTime: "4 min read",
    date: "July 18, 2026",
    author: {
      name: "Pandit Sitaram Jha",
      role: "Vedic Ritual Specialist",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200"
    },
    coverImage: "https://cdn.shopify.com/s/files/1/0878/4907/4985/files/Artboard1_19.webp?v=1782733204",
    excerpt: "Khatu Shyam Ji, the harbinger of hope and vanquisher of sorrow. Learn how placing a consecrated idol under a protective glass dome preserves sacred energies.",
    content: [
      "Barbareek (Khatu Shyam Ji) was granted the boon by Lord Krishna to be worshipped in Kali Yuga as Shyam. His divine presence eliminates distress and bestows fulfillment.",
      "The crystal-clear glass dome protects the consecrated brass idol from dust and environmental degradation while holding the consecrated pranic atmosphere inside."
    ],
    keyTakeaway: "Light a ghee lamp before Khatu Shyam Ji every evening for divine protection and mental serenity.",
    recommendedProduct: {
      title: "Khatu Shyam Murti with Dome",
      price: 1199,
      originalPrice: 1439,
      image: "https://cdn.shopify.com/s/files/1/0878/4907/4985/files/Artboard1_19.webp?v=1782733204",
      slug: "khatu-shyam-murti-with-dome",
      badge: "AUTHENTIC"
    }
  }
];

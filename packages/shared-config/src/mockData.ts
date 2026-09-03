import { NakshraProduct, Astrologer } from "@nakshra/shared-types";

// Fallback data used when the backend API and Supabase are both unreachable.
export const MOCK_PRODUCTS: NakshraProduct[] = [
  {
    id: 27,
    slug: "botswana-agate-bracelet",
    name: "BOTSWANA AGATE BRACELET",
    subtitle: "Vedic Energized & Authentic",
    category: "Bracelet",
    purpose: "Protection",
    price: 439,
    original: 549,
    rating: 5,
    reviews: 1,
    img: "https://images.unsplash.com/photo-1611312449408-fcece27cdbb7?w=400",
    badges: ["Trending", "Vedic Certified"],
    shortDesc: "Calmness, Protection & Emotional Balance",
    benefits: ["Brings emotional balance", "Protects from negative vibes", "Improves composure"],
    size: "Adjustable Stretch",
    material: "Natural Agate Stones",
    stock: 90
  },
  {
    id: 1,
    slug: "bagla-mukhi-yantra",
    name: "Bagla Mukhi Yantra",
    subtitle: "24K Gold Plated Frame",
    category: "Yantra",
    purpose: "Protection",
    price: 599,
    original: 899,
    rating: 4.8,
    reviews: 312,
    img: "https://cdn.shopify.com/s/files/1/0878/4907/4985/files/1_23.jpg?v=1782120393",
    badges: ["Temple Energized", "Bestseller"],
    shortDesc: "Stambhan · Vijay · Raksha. Controls negativity, brings victory in legal matters.",
    benefits: ["Victory in Legal Matters", "Protection From Enemies", "Increases Confidence"],
    size: "3.5 cm x 3.5 cm",
    material: "Metal (Golden Finish)",
    stock: 100
  },
  {
    id: 3,
    slug: "citrine-sun-ring",
    name: "Citrine Sun Ring",
    subtitle: "Natural Kundali Energized Gem",
    category: "Gemstone",
    purpose: "Wealth",
    price: 2499,
    original: 3499,
    rating: 4.7,
    reviews: 189,
    img: "https://cdn.shopify.com/s/files/1/0878/4907/4985/files/Artboard1_19.webp?v=1782733204",
    badges: ["Vedic Certified", "Gold Plated"],
    shortDesc: "Unlocks wisdom, mental clarity and commercial success under Guru's blessing.",
    benefits: ["Boosts Career & Business", "Enhances Intellect", "Brings Abundance"],
    size: "Resizable Ring",
    material: "Natural Citrine & Silver Alloy",
    stock: 50
  },
  {
    id: 4,
    slug: "pyrite-sun-ring",
    name: "Pyrite Sun Ring",
    subtitle: "Attract Prosperity & Financial Growth",
    category: "Gemstone",
    purpose: "Wealth",
    price: 699,
    original: 899,
    rating: 4.9,
    reviews: 240,
    img: "https://cdn.shopify.com/s/files/1/0878/4907/4985/files/1-1_f53e2d9e-40a0-4f0e-95a9-8d6a878b2f77.webp?v=1781163169",
    badges: ["Temple Energized"],
    shortDesc: "Pyrite Sun Ring connected to Surya Dev. Consecrated through 108 mantra rounds.",
    benefits: ["Attracts Wealth Flow", "Blocks Buri Nazar", "Surya Dev Protection"],
    size: "Resizable Ring",
    material: "Premium Brass & Raw Pyrite",
    stock: 50
  },
  {
    id: 26,
    slug: "brass-sun-east-wall",
    name: "Brass Sun for East Wall",
    subtitle: "Vedic Energized & Authentic",
    category: "Yantra",
    purpose: "Vastu",
    price: 1299,
    original: 1624,
    rating: 4.8,
    reviews: 84,
    img: "https://images.unsplash.com/photo-1596394723269-e5e2dbdbf4db?w=400",
    badges: ["Vastu Special"],
    shortDesc: "Brings good social, political and business connections when placed on the east wall.",
    benefits: ["Vastu Correction", "Social Recognition", "Improves Health & Energy"],
    size: "8 inches diameter",
    material: "Solid Brass",
    stock: 45
  },
  {
    id: 20,
    slug: "dhan-labh-tortoise",
    name: "Dhan Labh Tortoise",
    subtitle: "Authentic & Energized",
    category: "Yantra",
    purpose: "Vastu",
    price: 999,
    original: 1249,
    rating: 5,
    reviews: 62,
    img: "https://images.unsplash.com/photo-1600298881974-6be191ceeda1?w=400",
    badges: ["Bestseller"],
    shortDesc: "Vastu Tortoise crafted with Citrine crystals for financial stability and progress.",
    benefits: ["Invites Stable Income", "Protects Office Space", "Eases Cash Flow"],
    size: "4 inches",
    material: "Citrine & Brass Base",
    stock: 60
  }
];

export const MOCK_ASTROLOGERS: Astrologer[] = [
  {
    id: '1',
    name: 'Pandit Raghav Sharma',
    title: 'Senior Vedic Jyotish & Prashna Kundali Master',
    experience: '12+ Years Exp',
    rating: 4.9,
    consultations: 4800,
    specialties: ['Vedic Kundali', 'Gemstone Analysis', 'Prashna Shastra'],
    languages: ['Hindi', 'English', 'Sanskrit'],
    avatar: 'https://images.unsplash.com/photo-1566753323558-f4e0952af115?w=200',
    status: 'online',
    pricePerMin: 15,
    bio: 'Pandit Raghav is a highly respected Vedic astrologer with over a decade of experience guiding thousands towards career stability and peace.'
  },
  {
    id: '2',
    name: 'Acharya Meera Devi',
    title: 'Nadi & Prashna Kundali Specialist',
    experience: '8+ Years Exp',
    rating: 4.8,
    consultations: 3200,
    specialties: ['Nadi Jyotish', 'Vastu Shastra', 'Rudraksha Therapy'],
    languages: ['Hindi', 'English', 'Tamil'],
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200',
    status: 'online',
    pricePerMin: 12,
    bio: 'Acharya Meera specializes in Nadi charts, offering practical gemstone and rudraksha recommendations for cosmic alignment.'
  },
  {
    id: '3',
    name: 'Dr. Arvind Tripathi',
    title: 'Ayurvedic Astrologer & Vastu Master',
    experience: '15+ Years Exp',
    rating: 5.0,
    consultations: 6100,
    specialties: ['Medical Astrology', 'Gemstone Prescription', 'Yantra Energizing'],
    languages: ['Hindi', 'English'],
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
    status: 'busy',
    pricePerMin: 20,
    bio: 'Dr. Tripathi combines ancient Ayurvedic readings with Vastu alignments to harmonize health, wealth, and living spaces.'
  }
];

export const MOCK_REVIEWS = [
  { id: '1', name: 'Meera Iyer', rating: 5, text: 'My court case was pending for years. After installing this yantra, it resolved in 3 months. I am a believer now.', date: '3 days ago' },
  { id: '2', name: 'Deepak Sharma', rating: 5, text: 'The Bagla Mukhi Yantra is incredibly well-crafted. Gold finish is perfect and the engravings are sharp. Made by expert artisans.', date: '1 week ago' },
  { id: '3', name: 'Sanjay Gupta', rating: 4, text: 'Very nice energy. Highly recommend for home pooja room.', date: '2 weeks ago' }
];

export const FAQ_ITEMS = [
  { q: 'Are your products lab-certified?', a: 'Yes, all our gemstone rings, pendants, and rudraksha beads are tested by government-approved labs and delivered with original authenticity certificates.' },
  { q: 'How are the products energized?', a: 'Every item undergoes a sacred 5-step Vedic consecration ritual performed by our in-house pandits on auspicious tithis (timings).' },
  { q: 'Can I return an item if I am not satisfied?', a: 'Yes, we offer a 7-day no-questions-asked return window. The product must be returned with its original lab certificate and packaging.' },
  { q: 'How long does shipping take?', a: 'Orders are shipped within 24-48 hours via Delhivery/BlueDart. Delivery usually takes 3-5 business days across India.' }
];

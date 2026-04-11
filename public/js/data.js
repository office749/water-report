/* ============================================================= */
/* Hardcoded business data - prices, ZIP hardness, products, etc. */
/* ============================================================= */

const COMPANY = {
  name: "Llewellyn Plumbing Inc.",
  city: "Spanish Fork, Utah",
  phone: "(801) 899-9431",
  serviceArea: ["Utah County", "Salt Lake County", "Summit County"],
  discount: 100,
};

// ---------- ZIP code hardness table (Utah) ----------
const ZIP_HARDNESS = {
  // Provo
  "84601": 16, "84602": 16, "84603": 16, "84604": 16, "84605": 16, "84606": 16,
  // Spanish Fork
  "84660": 17,
  // Springville / Mapleton
  "84663": 17, "84664": 17,
  // Lehi
  "84043": 15,
  // Orem
  "84058": 15, "84059": 15, "84097": 15,
  // Pleasant Grove
  "84062": 14,
  // Draper
  "84020": 13,
  // Riverton
  "84065": 14,
  // Saratoga Springs
  "84045": 15,
  // Heber
  "84032": 13,
  // Park City
  "84060": 11,
  // Salt Lake City
  "84101": 13, "84102": 13, "84103": 13, "84104": 13, "84105": 13,
  "84106": 13, "84107": 13, "84108": 13, "84109": 12, "84110": 13,
  "84111": 13, "84112": 13, "84113": 13, "84114": 13, "84115": 13,
  "84116": 13, "84117": 12, "84118": 12, "84119": 13, "84120": 13,
  "84121": 12, "84122": 13, "84123": 12, "84124": 12, "84125": 13,
  "84126": 13, "84127": 13, "84128": 13, "84129": 13, "84130": 13,
  "84131": 13,
  // Bountiful
  "84010": 15,
  // Payson / Salem area
  "84651": 15, "84652": 15, "84653": 16, "84654": 16, "84655": 16, "84656": 15, "84657": 15,
};
const DEFAULT_HARDNESS = 15;

const UTAH_AVG_HARDNESS = 17;
const US_AVG_HARDNESS = 10;

// ---------- Sizes (grain) in order ----------
const SIZES = [48, 56, 64, 70, 96];

// ---------- Product pricing (pre-discount regular price, by size in thousands of grains) ----------
// Note: report shows price - $100 discount.
const PRODUCTS = {
  proMax: {
    key: "proMax",
    name: "Titan VI Pro-Max",
    tagline: "Clack-valve softener that tackles hardness, iron and manganese.",
    startingAt: 1850,
    prices: { 48: 1850, 56: 1925, 64: 2000, 70: 2075, 96: 2150 },
    removes: [
      "Calcium & magnesium (hardness)",
      "Iron up to 3 ppm",
      "Manganese up to 0.5 ppm",
    ],
    youllNotice: [
      "No more white scale on fixtures or glassware",
      "Softer skin and hair after showering",
      "Soap lathers better and goes further",
      "Appliances run quieter and last longer",
    ],
    specs: [
      "Clack valve technology",
      "WQA Gold Seal certified",
      "Up-flow regeneration (uses less salt & water)",
      "15-20 year lifespan",
      "Single tank, up to 96K grain",
    ],
    lifespan: "15-20 years",
  },
  blend: {
    key: "blend",
    name: "Titan VI Blend",
    tagline: "Softens water AND reduces chlorine, nitrates and arsenic in one tank.",
    startingAt: 2050,
    prices: { 48: 2050, 56: 2125, 64: 2200, 70: 2275, 96: 2275 },
    removes: [
      "Everything the Pro-Max removes",
      "Chlorine taste & smell",
      "Nitrates",
      "Arsenic",
      "Sulfates",
    ],
    youllNotice: [
      "Noticeably cleaner drinking water from every tap",
      "No chlorine pool smell in your shower",
      "Safer water for kids and pets",
      "The benefits of softener and filter in one",
    ],
    specs: [
      "Clack valve technology",
      "Blended media bed (resin + reducing media)",
      "Single tank footprint",
      "Up-flow regeneration",
      "15-20 year lifespan",
    ],
    lifespan: "15-20 years",
  },
  ultima: {
    key: "ultima",
    name: "Titan VI Ultima",
    tagline: "Full whole-home filtration + softening. The most complete option we sell.",
    startingAt: 2900,
    prices: { 48: 2825, 56: 2900, 64: 2975, 70: 3050, 96: 3050 },
    removes: [
      "Everything the Blend removes",
      "PFAS (forever chemicals)",
      "VOCs & THMs",
      "Chloramines",
      "Heavy metals (lead, copper)",
      "Pharmaceutical residues",
    ],
    youllNotice: [
      "Bottled-quality water from every faucet in the house",
      "Noticeably better taste in coffee, tea and cooking",
      "Healthier showers and baths",
      "Peace of mind that the whole home is protected",
    ],
    specs: [
      "Dual-chamber design",
      "NSF Certified Coconut Shell Carbon",
      "Clack valve technology",
      "Whole-home protection",
      "15-20 year lifespan",
    ],
    lifespan: "15-20 years",
  },
};

// ---------- Bundle ----------
const BUNDLE = {
  name: "Grand Slam Bundle",
  tagline: "Our most popular package - the Ultima + free upgrades.",
  price: 3299, // bundle price AFTER discount logic (we still show regular vs final)
  regularPrice: 3399, // show $100 off
  includes: [
    { name: "Titan VI Ultima whole-home system", value: 2900, free: false },
    { name: "Reverse Osmosis drinking water system", value: 650, free: true },
    { name: "Salt Sensor (smart monitoring)", value: 125, free: true },
    { name: "Annual Check-Up service", value: 200, free: true },
  ],
  totalValue: 3875, // sum of list prices
  youSave: 676,
};

// ---------- Add-ons ----------
const ADDONS = {
  ozone: {
    name: "Titan UF Ozone System",
    startingAt: 2400,
    regular: 2500,
    blurb: "Adds ozone disinfection and 0.01-micron ultrafiltration. Eliminates bacteria, viruses and pathogens from your home water - the ultimate well or rural peace-of-mind add-on.",
  },
  ro: {
    name: "Reverse Osmosis Drinking Water",
    startingAt: 650,
    regular: 750,
    blurb: "Under-sink drinking water system. Removes 99% of TDS, lead, fluoride, nitrates and pharmaceuticals for clean drinking water straight from the tap.",
  },
};

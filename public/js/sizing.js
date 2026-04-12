/* ============================================================= */
/* Sizing and price calculation                                   */
/* ============================================================= */

/**
 * Grains needed per week = people x 75 gal/day x hardness GPG x 7 days
 */
function calcGrainsNeeded(people, hardness) {
  return people * 75 * hardness * 7;
}

/**
 * Pick the smallest available size (in thousands of grains) that
 * is >= the grains needed. Minimum is 48K. Max listed is 96K.
 */
function pickSizeForProduct(grainsNeeded, product) {
  // Map grains to thousands
  const thousands = grainsNeeded / 1000;
  // Valid sizes for this product are the ones in its price table
  const sizes = Object.keys(product.prices).map(Number).sort((a, b) => a - b);
  for (const s of sizes) {
    if (s >= thousands) return s;
  }
  // If we exceed largest, return largest
  return sizes[sizes.length - 1];
}

function getProductPrice(product, sizeK) {
  return product.prices[sizeK] || product.startingAt;
}

/**
 * Prices stored in data.js (PRODUCTS.prices, BUNDLE.price, ADDONS.startingAt)
 * are the customer-facing FINAL installed prices. Everywhere a price is
 * shown in the report or the form preview, we display the final price
 * next to a "regular" price that is final + COMPANY.discount, so the
 * customer sees a clean "$X was, $Y now, $DISCOUNT off" story.
 *
 * A single COMPANY.discount knob drives every crossed-out price in the
 * whole app - change that one number and the regular prices everywhere
 * update together.
 */
function withDiscount(finalPrice) {
  const save = COMPANY.discount;
  return {
    final: finalPrice,
    regular: finalPrice + save,
    save,
  };
}

function formatMoney(n) {
  return "$" + Number(n).toLocaleString("en-US");
}

/**
 * Classify a hardness level. Industry standard breakpoints:
 *   0-1    Soft
 *   1-3.5  Slightly hard
 *   3.5-7  Moderately hard
 *   7-10.5 Hard
 *   10.5+  Very hard
 * Utah County water (14-25 GPG) is solidly "Very Hard".
 */
function classifyHardness(h) {
  if (h >= 11) return "Very Hard";
  if (h >= 7)  return "Hard";
  if (h >= 4)  return "Moderately Hard";
  if (h >= 1)  return "Slightly Hard";
  return "Soft";
}

/**
 * How many times harder the customer's water is vs. the US average.
 * Returned as a formatted string like "1.7x" for use in callouts.
 */
function hardnessMultiplier(h) {
  return (h / US_AVG_HARDNESS).toFixed(1) + "x";
}

/**
 * Compute realistic annual damage costs by category, scaled to the
 * customer's hardness level. Numbers are tuned so that a Utah
 * County home at 17 GPG lands inside the ranges Llewellyn uses in
 * their sales deck:
 *   water heater       $150-300
 *   pipes & fixtures   $75-150
 *   appliances         $100-200
 *   skin & hair        $50-150
 *   dishes & laundry   $50-100
 * and the household total falls inside the commonly-quoted Utah
 * hard-water cost range of $500-$800 per year.
 */
const DAMAGE_CATEGORIES = [
  {
    category: "Water heater & tankless",
    perGpg: 13,
    description: "Scale plates onto heating elements and the tank, cutting efficiency 20-30% and shortening the heater's life by years.",
  },
  {
    category: "Pipes & fixtures",
    perGpg: 6.5,
    description: "Calcium narrows copper lines from the inside and chews through brass fittings and aerator screens.",
  },
  {
    category: "Appliances (dishwasher, washer, coffee maker)",
    perGpg: 9,
    description: "Hard water steals up to a third of the service life of dishwashers, washing machines and coffee makers.",
  },
  {
    category: "Skin & hair",
    perGpg: 6,
    description: "Calcium traps soap on skin and hair, leaving them dry and forcing extra lotion, shampoo and conditioner.",
  },
  {
    category: "Dishes & laundry",
    perGpg: 4.5,
    description: "Spotty glassware, dingy whites, and 2x the detergent needed to get anything clean.",
  },
];

function computeDamages(hardness) {
  const sev =
    hardness >= 14 ? "High" :
    hardness >= 8  ? "Medium" : "Low";

  return DAMAGE_CATEGORIES.map((c) => {
    const raw = hardness * c.perGpg;
    const cost = Math.round(raw / 5) * 5; // round to nearest $5
    return {
      category: c.category,
      severity: sev,
      annualCost: cost,
      description: c.description,
    };
  });
}

function totalAnnualDamage(hardness) {
  return computeDamages(hardness).reduce((s, d) => s + d.annualCost, 0);
}

/**
 * Returns { grainsNeeded, systems: {proMax|blend|ultima: {sizeK, final, regular, save}}, bundle: {final, regular, save} }
 */
function calcAllSizing(people, hardness) {
  const grainsNeeded = calcGrainsNeeded(people, hardness);

  const result = { grainsNeeded, systems: {} };
  for (const key of ["proMax", "blend", "ultima"]) {
    const p = PRODUCTS[key];
    const sizeK = pickSizeForProduct(grainsNeeded, p);
    const finalPrice = getProductPrice(p, sizeK);
    result.systems[key] = { sizeK, ...withDiscount(finalPrice) };
  }
  result.bundle = withDiscount(BUNDLE.price);
  return result;
}

/**
 * Look up hardness for a ZIP with fallback.
 */
function lookupHardness(zip) {
  if (!zip) return null;
  const clean = String(zip).trim().slice(0, 5);
  return ZIP_HARDNESS[clean] || null;
}

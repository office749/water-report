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

function applyDiscount(regular) {
  return regular - COMPANY.discount;
}

function formatMoney(n) {
  return "$" + Number(n).toLocaleString("en-US");
}

/**
 * Returns { grainsNeeded, sizes: {proMax, blend, ultima}, prices: {proMax:{regular, final, sizeK}, ...}, bundle: {regular, final} }
 */
function calcAllSizing(people, hardness) {
  const grainsNeeded = calcGrainsNeeded(people, hardness);

  const result = { grainsNeeded, systems: {} };
  for (const key of ["proMax", "blend", "ultima"]) {
    const p = PRODUCTS[key];
    const sizeK = pickSizeForProduct(grainsNeeded, p);
    const regular = getProductPrice(p, sizeK);
    const final = applyDiscount(regular);
    result.systems[key] = { sizeK, regular, final };
  }
  result.bundle = {
    regular: BUNDLE.regularPrice,
    final: BUNDLE.price,
  };
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

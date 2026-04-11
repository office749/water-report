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

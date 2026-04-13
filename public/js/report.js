/* ============================================================= */
/* Report renderer - builds the 9-page infographic report        */
/* ============================================================= */

function escapeHtml(s) {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function todayFormatted() {
  const d = new Date();
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function firstName(fullName) {
  if (!fullName) return "";
  const firstWord = fullName.split(/\s|&|,/)[0];
  return firstWord || fullName;
}

/* ---------- Infographic primitives ---------- */

/** A single "big number + small label" tile. */
function statTile(big, small, variant) {
  return `
    <div class="stat-tile ${variant || ""}">
      <div class="stat-big">${escapeHtml(big)}</div>
      <div class="stat-small">${escapeHtml(small)}</div>
    </div>
  `;
}

/** A row of 2-4 stat tiles. Pass an array of {big, small, variant?}. */
function statTileRow(tiles) {
  return `<div class="stat-row">${tiles.map((t) => statTile(t.big, t.small, t.variant)).join("")}</div>`;
}

/**
 * Visual hardness comparison bar - three stacked rows showing
 * US avg / Utah avg / their home, each scaled to a 25 GPG max.
 * Pure white background, brand-blue fill, brand-blue border.
 */
function hardnessCompareBar(theirs) {
  const max = 25;
  const pct = (v) => Math.min(100, Math.round((v / max) * 100));
  const row = (label, value, cls) => `
    <div class="compare-row ${cls || ""}">
      <div class="compare-label">${escapeHtml(label)}</div>
      <div class="compare-track">
        <div class="compare-fill" style="width:${pct(value)}%"></div>
      </div>
      <div class="compare-value">${value} GPG</div>
    </div>
  `;
  return `
    <div class="hardness-compare">
      ${row("US average", US_AVG_HARDNESS, "")}
      ${row("Utah average", UTAH_AVG_HARDNESS, "")}
      ${row("Your home", theirs, "theirs")}
    </div>
  `;
}

/** A callout box with Utah hard-water facts. */
function utahCallout(facts, title) {
  const items = (facts || []).map((f) => `<li>${escapeHtml(f)}</li>`).join("");
  return `
    <div class="utah-callout">
      <div class="utah-callout-badge">UTAH WATER FACTS</div>
      <div class="utah-callout-title">${escapeHtml(title || "What we know about Utah water")}</div>
      <ul class="utah-callout-list">${items}</ul>
    </div>
  `;
}

/** Render a page's punchy top headline (from AI) */
function pageHeadline(text) {
  if (!text) return "";
  return `<div class="page-headline">${escapeHtml(text)}</div>`;
}

/** Convert an array field to punchy bullets. */
function bulletList(items, cls) {
  if (!Array.isArray(items) || !items.length) return "";
  const lis = items.map((i) => `<li>${escapeHtml(i)}</li>`).join("");
  return `<ul class="punch-list ${cls || ""}">${lis}</ul>`;
}

/* ---------- Price / addon helpers ---------- */

function renderAddonCard(addon) {
  const finalPrice = addon.startingAt;
  const regular = finalPrice + COMPANY.discount;
  const save = COMPANY.discount;
  return `
    <div class="addon-card">
      <h4>${escapeHtml(addon.name)}</h4>
      <p>${escapeHtml(addon.blurb)}</p>
      <div class="price-row">
        <span class="price-strike">$${regular.toLocaleString()}</span>
        <span class="price-final">$${finalPrice.toLocaleString()}</span>
        <span class="save-badge">$${save} off</span>
      </div>
      <small class="addon-note">starting at &middot; installed</small>
    </div>
  `;
}

function priceBar(regular, final) {
  const save = Math.max(0, regular - final);
  return `
    <div class="price-row">
      <span class="price-strike">$${regular.toLocaleString()}</span>
      <span class="price-final">$${final.toLocaleString()}</span>
      ${save > 0 ? `<span class="save-badge">$${save.toLocaleString()} off</span>` : ""}
    </div>
  `;
}

/* ---------- Chrome ---------- */

function pageHeader(title) {
  return `
    <div class="page-header">
      <img src="assets/logo.png" alt="Llewellyn Plumbing" class="logo-on-white" />
      <div class="page-title">${escapeHtml(title)}</div>
    </div>
  `;
}

function pageFooter(ctx, pageNum) {
  return `
    <div class="page-footer">
      <span>${escapeHtml(COMPANY.name)} &middot; ${escapeHtml(COMPANY.phone)}</span>
      <span>Prepared for ${escapeHtml(ctx.customerName)} &middot; Page ${pageNum}</span>
    </div>
  `;
}

/* -------- Page 1: Cover -------- */
function renderCover(ctx, sizing) {
  const classification = classifyHardness(ctx.hardness);
  const multiplier = hardnessMultiplier(ctx.hardness);
  return `
  <div class="report-cover">
    <div class="cover-inner">
      <img src="assets/logo.png" alt="Llewellyn Plumbing" class="cover-logo logo-on-white" />
      <h1 class="cover-title">Home Water Quality<br/>Assessment</h1>
      <div class="cover-subtitle">Presented to you today by your Llewellyn Plumbing technician</div>
      <div class="cover-divider"></div>

      <div class="cover-customer-block">
        <div class="customer-name">Prepared for ${escapeHtml(ctx.customerName)}</div>
        <div>${escapeHtml(ctx.address)}</div>
        <div>${escapeHtml(todayFormatted())} &middot; Technician: ${escapeHtml(ctx.techName)}</div>
      </div>

      <div class="cover-stats">
        <div class="cover-stat">
          <div class="value">${ctx.hardness} GPG</div>
          <div class="label">Your water hardness</div>
        </div>
        <div class="cover-stat">
          <div class="value">${escapeHtml(classification)}</div>
          <div class="label">Utah classification</div>
        </div>
        <div class="cover-stat">
          <div class="value">${multiplier}</div>
          <div class="label">harder than US average</div>
        </div>
      </div>

      <div class="cover-toc">
        <h3>What we'll walk through today</h3>
        <ol>
          <li>What's in your water</li>
          <li>What hard water is costing you</li>
          <li>What we know about your water</li>
          <li>Option 1 &middot; Titan VI Pro-Max</li>
          <li>Option 2 &middot; Titan VI Blend</li>
          <li>Option 3 &middot; Titan VI Ultima</li>
          <li>The Grand Slam Bundle</li>
          <li>Add-ons &amp; what's next</li>
        </ol>
      </div>

      <div class="cover-footer">
        <div class="cover-discount">$${COMPANY.discount} off already included</div>
        <div class="cover-phone">${escapeHtml(COMPANY.phone)}</div>
        <div class="cover-tagline">Spanish Fork, UT &middot; Utah County &middot; Salt Lake County &middot; Summit County</div>
      </div>
    </div>
  </div>
  `;
}

/* -------- Page 2: What's in your water -------- */
function renderPage2(ctx, content) {
  const p = content.page2 || {};
  const classification = classifyHardness(ctx.hardness);
  const multiplier = hardnessMultiplier(ctx.hardness);

  return `
  <div class="report-page">
    ${pageHeader("What's in your water")}
    ${pageHeadline(p.headline || `Your water is ${multiplier} the national average.`)}
    <h1 class="page-h1">Let's talk about your water, ${escapeHtml(firstName(ctx.customerName))}</h1>
    <div class="page-h1-underline"></div>

    <p class="page-lead">${escapeHtml(p.opening || "")}</p>

    <div class="section">
      <h3>How your water compares</h3>
      ${hardnessCompareBar(ctx.hardness)}
      <p class="tight">${escapeHtml(p.hardnessBlurb || "")}</p>
    </div>

    <div class="mineral-fact-callout">
      At ${ctx.hardness} GPG, your water contains roughly <strong>${ctx.hardness} teaspoons of dissolved minerals</strong> for every 1,000 gallons flowing through your pipes, appliances, and fixtures.
    </div>

    <div class="section">
      <h3>Where your water comes from</h3>
      <p class="tight">${escapeHtml(p.waterSource || "")}</p>
    </div>

    <div class="section">
      <h3>What this means inside your home</h3>
      ${bulletList(p.likelyIssues, "likely-issues")}
    </div>

    ${utahCallout(UTAH_FACTS.facts.slice(0, 3), "Why Utah water is so hard")}

    ${pageFooter(ctx, 2)}
  </div>
  `;
}

/* -------- Page 3: Cost of hard water (computed damages) -------- */
function renderPage3(ctx, content) {
  const p = content.page3 || {};
  const damages = computeDamages(ctx.hardness);
  const total = totalAnnualDamage(ctx.hardness);

  const rowsHtml = damages.map((d) => {
    const sev = d.severity.toLowerCase();
    const sevClass = "severity-" + sev;
    const barPct = sev === "high" ? 100 : sev === "medium" ? 60 : 30;
    return `
    <div class="damage-row">
      <div class="damage-info">
        <h4>${escapeHtml(d.category)}</h4>
        <p>${escapeHtml(d.description)}</p>
        <div class="severity-bar">
          <div class="severity-bar-fill ${sevClass}" style="width:${barPct}%"></div>
        </div>
      </div>
      <div class="damage-sev"><span class="severity-pill ${sevClass}">${escapeHtml(d.severity)}</span></div>
      <div class="cost-cell">$${d.annualCost.toLocaleString()}<span class="per-year">/yr</span></div>
    </div>
    `;
  }).join("");

  return `
  <div class="report-page">
    ${pageHeader("The cost of hard water")}
    ${pageHeadline(p.headline || `At ${ctx.hardness} GPG, hard water is costing your home every day.`)}
    <h1 class="page-h1">What hard water is costing your home every year</h1>
    <div class="page-h1-underline"></div>

    <p class="page-lead">${escapeHtml(p.intro || "")}</p>

    <div class="damage-table">
      ${rowsHtml}
    </div>

    <div class="total-cost-box">
      <div class="label">Estimated annual damage &amp; waste</div>
      <div class="value">$${total.toLocaleString()}<span class="per-year">/year</span></div>
    </div>

    <div class="ten-year-box">
      Over 10 years that's <strong>$${(total * 10).toLocaleString()}</strong> in damage and waste &mdash; without a solution.
    </div>

    ${pageFooter(ctx, 3)}
  </div>
  `;
}

/* -------- Page 4: Local water profile + install readiness -------- */
function renderPage4(ctx, content) {
  const p = content.page4 || {};
  const loopClass = ctx.loop === "Yes" ? "loop-yes" : ctx.loop === "No" ? "loop-no" : "loop-unknown";
  const classification = classifyHardness(ctx.hardness);

  return `
  <div class="report-page">
    ${pageHeader("What we know about your water")}
    ${pageHeadline(p.headline || `Wasatch-fed, very hard, ready for treatment.`)}
    <h1 class="page-h1">What we know about your water</h1>
    <div class="page-h1-underline"></div>

    ${statTileRow([
      { big: ctx.hardness + " GPG", small: "Your hardness", variant: "theirs" },
      { big: escapeHtml(classification), small: "Utah rating" },
      { big: escapeHtml(p.waterSourceShort || "Wasatch snowmelt"), small: "Source" },
      { big: escapeHtml(p.treatmentShort || "Municipal chlorine"), small: "Treatment" },
    ])}

    <div class="section">
      <h3>What install day looks like &middot; loop status: <span class="loop-pill ${loopClass}">${escapeHtml(ctx.loop)}</span></h3>
      <p class="tight">${escapeHtml(p.installReadiness || "")}</p>
    </div>

    ${ctx.techNotes ? `
    <div class="section">
      <h3>From our earlier conversation</h3>
      <p class="tight">${escapeHtml(ctx.techNotes)}</p>
    </div>` : ""}

    ${pageFooter(ctx, 4)}
  </div>
  `;
}

/* -------- System pages (5, 6, 7) -------- */
function renderSystemPage(ctx, content, productKey, sizing, pageNum, eyebrow) {
  const product = PRODUCTS[productKey];
  const personal = content[productKey] || {};
  const sz = sizing.systems[productKey];

  const removes = product.removes.map((r) => `<li>${escapeHtml(r)}</li>`).join("");
  const notice = product.youllNotice.map((r) => `<li>${escapeHtml(r)}</li>`).join("");
  const specs = product.specs.map((r) => `<li>${escapeHtml(r)}</li>`).join("");

  return `
  <div class="report-page">
    ${pageHeader(eyebrow)}
    <div class="system-card">
      <div class="system-header">
        <div class="eyebrow">${escapeHtml(eyebrow)}</div>
        <h2>${escapeHtml(product.name)}</h2>
        <div class="tagline">${escapeHtml(personal.headline || product.tagline)}</div>
      </div>

      <div class="system-twocol">
        <div class="system-section">
          <h3>What this handles in your water</h3>
          <p class="tight">${escapeHtml(personal.whatIsInYourWater || "")}</p>
        </div>
        <div class="system-section">
          <h3>Why we'd recommend this for your home</h3>
          <p class="tight">${escapeHtml(personal.whyRightForYou || "")}</p>
        </div>
      </div>

      <div class="system-specs">
        <div>
          <h4>What it removes</h4>
          <ul>${removes}</ul>
        </div>
        <div>
          <h4>What you'll notice</h4>
          <ul>${notice}</ul>
        </div>
        <div>
          <h4>Key specs</h4>
          <ul>${specs}</ul>
        </div>
        <div>
          <h4>Sized for your home</h4>
          <ul>
            <li>${sz.sizeK}K grain capacity</li>
            <li>${ctx.people}-person household at ${ctx.hardness} GPG</li>
            <li>Installed by a licensed Llewellyn Plumbing tech</li>
            <li>${escapeHtml(product.lifespan)} expected lifespan</li>
          </ul>
        </div>
      </div>

      <div class="system-price-bar">
        <div class="size-note">Your price &middot; <strong>${sz.sizeK}K grain installed</strong><br/><small>$${sz.save} off already included</small></div>
        ${priceBar(sz.regular, sz.final)}
      </div>

      <div class="roi-box">
        Based on your estimated <strong>$${totalAnnualDamage(ctx.hardness).toLocaleString()}/year</strong> in hard water costs, this system pays for itself in approximately <strong>${(sz.final / totalAnnualDamage(ctx.hardness)).toFixed(1)} years</strong>.
      </div>
    </div>
    ${pageFooter(ctx, pageNum)}
  </div>
  `;
}

/* -------- Comparison table page -------- */
function renderComparisonPage(ctx, sizing) {
  const row = (label, pm, bl, ul) => `
    <tr>
      <td class="cmp-label">${escapeHtml(label)}</td>
      <td class="cmp-val">${pm}</td>
      <td class="cmp-val">${bl}</td>
      <td class="cmp-val">${ul}</td>
    </tr>`;
  const ck = '<span class="cmp-yes">&#10003;</span>';
  const no = '<span class="cmp-no">&#10007;</span>';
  const szPM = sizing.systems.proMax;
  const szBL = sizing.systems.blend;
  const szUL = sizing.systems.ultima;

  return `
  <div class="report-page">
    ${pageHeader("Compare your options")}
    <h1 class="page-h1">Side-by-side comparison</h1>
    <div class="page-h1-underline"></div>

    <table class="cmp-table">
      <thead>
        <tr>
          <th></th>
          <th class="cmp-head">Pro-Max</th>
          <th class="cmp-head">Blend</th>
          <th class="cmp-head cmp-head-best">Ultima</th>
        </tr>
      </thead>
      <tbody>
        ${row("Price", priceBar(szPM.regular, szPM.final), priceBar(szBL.regular, szBL.final), priceBar(szUL.regular, szUL.final))}
        ${row("Grain size", szPM.sizeK + "K", szBL.sizeK + "K", szUL.sizeK + "K")}
        ${row("Removes hardness", ck, ck, ck)}
        ${row("Removes chlorine", no, ck, ck)}
        ${row("Removes nitrates & arsenic", no, ck, ck)}
        ${row("Removes PFAS & VOCs", no, no, ck)}
        ${row("Removes chloramines", no, no, ck)}
        ${row("Best for", "Budget-conscious<br/>homes that want<br/>softer water", "Families that want<br/>cleaner taste from<br/>every tap", "Full whole-home<br/>filtration and<br/>peace of mind")}
      </tbody>
    </table>

    ${pageFooter(ctx, 8)}
  </div>
  `;
}

/* -------- Bundle page -------- */
function renderBundlePage(ctx, content, sizing) {
  const b = content.bundle || {};

  // Transparent line-item math. Each row shows the item's value
  // as part of the bundle. No "FREE" labels - we charge for every
  // piece, the savings come from buying them together.
  const sumOfItems = BUNDLE.includes.reduce((s, i) => s + i.value, 0);
  const bundlePrice = BUNDLE.price;
  const savings = Math.max(0, sumOfItems - bundlePrice);

  const rows = BUNDLE.includes.map((inc) => `
    <div class="row">
      <div>${escapeHtml(inc.name)}</div>
      <div class="price">$${inc.value.toLocaleString()}</div>
    </div>
  `).join("");

  return `
  <div class="report-page">
    ${pageHeader("Grand Slam Bundle")}
    ${pageHeadline(b.headline || `Everything together, $${savings} off the list total.`)}
    <h1 class="page-h1">The Grand Slam Bundle</h1>
    <div class="page-h1-underline"></div>

    <div class="bundle-hero">
      <h2>${escapeHtml(BUNDLE.name)}</h2>
      <div class="tag">${escapeHtml(BUNDLE.tagline)}</div>
      <div class="price-line">
        <span class="price-strike">$${sumOfItems.toLocaleString()}</span>
        <span class="price-final">$${bundlePrice.toLocaleString()}</span>
        <span class="save-badge">$${savings.toLocaleString()} saved</span>
      </div>
    </div>

    <div class="section">
      <h3>Here's the math</h3>
      <div class="bundle-breakdown">
        ${rows}
        <div class="row subtotal">
          <div>Total if purchased as separate line items</div>
          <div class="price">$${sumOfItems.toLocaleString()}</div>
        </div>
        <div class="row bundle">
          <div>Grand Slam Bundle price</div>
          <div class="price">$${bundlePrice.toLocaleString()}</div>
        </div>
        <div class="row savings">
          <div>Your savings with the bundle</div>
          <div class="price">&minus;$${savings.toLocaleString()}</div>
        </div>
      </div>
    </div>

    <div class="section">
      <h3>Why we brought this to you today</h3>
      <p class="tight">${escapeHtml(b.personalizedReason || "")}</p>
    </div>

    ${pageFooter(ctx, 9)}
  </div>
  `;
}

/* -------- Last page: Add-ons, what changes, CTA -------- */
function renderPage9(ctx, content) {
  const p = content.page9 || {};
  return `
  <div class="report-page">
    ${pageHeader("Add-ons & what comes next")}
    <h1 class="page-h1">A few more things to think about</h1>
    <div class="page-h1-underline"></div>

    <div class="section">
      <h3>Optional add-ons we can pair with any option</h3>
      <p class="tight">${escapeHtml(p.addOnsIntro || "")}</p>
      <div class="addon-grid">
        ${renderAddonCard(ADDONS.ozone)}
        ${renderAddonCard(ADDONS.ro)}
      </div>
    </div>

    <div class="section">
      <h3>What life looks like after we install this</h3>
      ${bulletList(p.whatChanges)}
    </div>

    <div class="cta-box">
      <h3>Let's get this scheduled, ${escapeHtml(firstName(ctx.customerName))}</h3>
      <p class="cta-urgency">Every month without treated water costs your home approximately <strong>$${Math.round(totalAnnualDamage(ctx.hardness) / 12).toLocaleString()}</strong>. Today is the day to stop paying that. We are ready to schedule your installation &mdash; most jobs are completed within <strong>3-5 business days</strong> of signing.</p>
      <div class="phone">${escapeHtml(COMPANY.phone)}</div>
      <small class="cta-tagline">${escapeHtml(COMPANY.name)} &middot; Spanish Fork, UT</small>
    </div>

    ${pageFooter(ctx, 10)}
  </div>
  `;
}

/* -------- Main render -------- */
function renderReport(ctx, content) {
  const sizing = calcAllSizing(ctx.people, ctx.hardness);
  return [
    renderCover(ctx, sizing),
    renderPage2(ctx, content),
    renderPage3(ctx, content),
    renderPage4(ctx, content),
    renderSystemPage(ctx, content, "proMax", sizing, 5, "Option 1 of 3"),
    renderSystemPage(ctx, content, "blend", sizing, 6, "Option 2 of 3"),
    renderSystemPage(ctx, content, "ultima", sizing, 7, "Option 3 of 3"),
    renderComparisonPage(ctx, sizing),
    renderBundlePage(ctx, content, sizing),
    renderPage9(ctx, content),
  ].join("");
}

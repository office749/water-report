/* ============================================================= */
/* Report renderer - builds the 9-page HTML report                */
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

function priceBar(regular, final) {
  return `
    <div class="price-row">
      <span class="price-strike">$${regular.toLocaleString()}</span>
      <span class="price-final">$${final.toLocaleString()}</span>
    </div>
  `;
}

function pageHeader(title) {
  return `
    <div class="page-header">
      <img src="assets/logo.svg" alt="Llewellyn Plumbing" onerror="this.src='assets/logo.png'" />
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
  return `
  <div class="report-page cover">
    <div class="cover-inner">
      <img src="assets/logo.svg" alt="Llewellyn Plumbing" class="cover-logo" onerror="this.src='assets/logo.png'" />
      <h1 class="cover-title">Home Water Quality<br/>Assessment</h1>
      <div class="cover-subtitle">Personalized findings &amp; recommendations</div>
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
          <div class="value">${ctx.people}</div>
          <div class="label">People in the home</div>
        </div>
      </div>

      <div class="cover-toc">
        <h3>Inside this report</h3>
        <ol>
          <li>What's in your water</li>
          <li>The cost of hard water</li>
          <li>On-site equipment assessment</li>
          <li>Titan VI Pro-Max softener</li>
          <li>Titan VI Blend softener</li>
          <li>Titan VI Ultima system</li>
          <li>Grand Slam Bundle</li>
          <li>Add-ons &amp; next steps</li>
        </ol>
      </div>

      <div class="cover-footer">
        <div class="cover-discount">$100 off already included</div>
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
  return `
  <div class="report-page">
    ${pageHeader("What's in your water")}
    <h1 class="page-h1">What is in your water, ${escapeHtml(firstName(ctx.customerName))}?</h1>
    <div class="page-h1-underline"></div>

    <p class="page-lead">${escapeHtml(p.opening || "")}</p>

    <div class="section">
      <h3>Where your water comes from</h3>
      <p>${escapeHtml(p.waterSource || "")}</p>
    </div>

    <div class="section">
      <h3>Your hardness level: ${ctx.hardness} GPG</h3>
      <div class="hardness-stats">
        <div class="hardness-stat">
          <div class="big">${US_AVG_HARDNESS} GPG</div>
          <div class="small-label">US average</div>
        </div>
        <div class="hardness-stat">
          <div class="big">${UTAH_AVG_HARDNESS} GPG</div>
          <div class="small-label">Utah average</div>
        </div>
        <div class="hardness-stat theirs">
          <div class="big">${ctx.hardness} GPG</div>
          <div class="small-label">Your home</div>
        </div>
      </div>
      <p>${escapeHtml(p.hardnessExplanation || "")}</p>
    </div>

    <div class="section">
      <h3>What else is in your water</h3>
      <p>${escapeHtml(p.otherContaminants || "")}</p>
    </div>

    <div class="section">
      <h3>Why you're noticing the issues you reported</h3>
      <p>${escapeHtml(p.problemExplanation || "")}</p>
    </div>

    ${pageFooter(ctx, 2)}
  </div>
  `;
}

/* -------- Page 3: Cost of hard water -------- */
function renderPage3(ctx, content) {
  const p = content.page3 || {};
  const damages = p.damages || [];
  const total = damages.reduce((s, d) => s + (Number(d.annualCost) || 0), 0);

  const rowsHtml = damages.map((d) => {
    const sev = (d.severity || "Medium").toLowerCase();
    const sevClass = sev === "high" ? "severity-high" : sev === "low" ? "severity-low" : "severity-medium";
    return `
    <div class="damage-row">
      <div>
        <h4>${escapeHtml(d.category || "")}</h4>
        <p>${escapeHtml(d.description || "")}</p>
      </div>
      <div><span class="severity-pill ${sevClass}">${escapeHtml(d.severity || "Medium")}</span></div>
      <div class="cost-cell">$${Number(d.annualCost || 0).toLocaleString()}/yr</div>
    </div>
    `;
  }).join("");

  return `
  <div class="report-page">
    ${pageHeader("The cost of hard water")}
    <h1 class="page-h1">What hard water is doing to your home</h1>
    <div class="page-h1-underline"></div>

    <p class="page-lead">${escapeHtml(p.intro || "")}</p>

    <div class="damage-table">
      ${rowsHtml}
    </div>

    <div class="total-cost-box">
      <div class="label">Estimated annual damage &amp; waste</div>
      <div class="value">$${total.toLocaleString()}/year</div>
    </div>

    <p class="page-lead" style="margin-top:14px;">${escapeHtml(p.totalCostMessage || "")}</p>

    ${pageFooter(ctx, 3)}
  </div>
  `;
}

/* -------- Page 4: Equipment + loop assessment -------- */
function renderPage4(ctx, content, photosDataUrls) {
  const p = content.page4 || {};
  const loopClass = ctx.loop === "Yes" ? "loop-yes" : ctx.loop === "No" ? "loop-no" : "loop-unknown";

  const photoGrid = (photosDataUrls && photosDataUrls.length)
    ? `<div class="equip-photos">${photosDataUrls.slice(0, 6).map((u) => `<img src="${escapeHtml(u)}" alt="Equipment photo" />`).join("")}</div>`
    : "";

  return `
  <div class="report-page">
    ${pageHeader("On-site assessment")}
    <h1 class="page-h1">What your technician observed</h1>
    <div class="page-h1-underline"></div>

    <div class="section">
      <h3>Equipment &amp; condition</h3>
      ${photoGrid}
      <p>${escapeHtml(p.equipmentObservation || "")}</p>
    </div>

    <div class="section">
      <h3>Softener loop status: <span class="loop-pill ${loopClass}">${escapeHtml(ctx.loop)}</span></h3>
      <p>${escapeHtml(p.loopAssessment || "")}</p>
    </div>

    ${ctx.techNotes ? `
    <div class="section">
      <h3>Technician notes</h3>
      <p>${escapeHtml(ctx.techNotes)}</p>
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
        <div class="tagline">${escapeHtml(product.tagline)}</div>
      </div>

      <div class="system-twocol">
        <div class="system-section">
          <h3>What is in your water</h3>
          <p>${escapeHtml(personal.whatIsInYourWater || "")}</p>
        </div>
        <div class="system-section">
          <h3>Why this system is right for you</h3>
          <p>${escapeHtml(personal.whyRightForYou || "")}</p>
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
        <div class="size-note">Your price &middot; <strong>${sz.sizeK}K grain installed</strong><br/><small>$100 off already included</small></div>
        ${priceBar(sz.regular, sz.final)}
      </div>
    </div>
    ${pageFooter(ctx, pageNum)}
  </div>
  `;
}

/* -------- Page 8: Bundle -------- */
function renderBundlePage(ctx, content, sizing) {
  const b = content.bundle || {};

  const rows = BUNDLE.includes.map((inc) => `
    <div class="row ${inc.free ? "free" : ""}">
      <div>${escapeHtml(inc.name)}${inc.free ? " <strong style='color:#27ae60'>(FREE)</strong>" : ""}</div>
      <div class="price">$${inc.value.toLocaleString()}</div>
    </div>
  `).join("");

  return `
  <div class="report-page">
    ${pageHeader("Grand Slam Bundle")}
    <h1 class="page-h1">The Grand Slam Bundle</h1>
    <div class="page-h1-underline"></div>

    <div class="bundle-hero">
      <h2>${escapeHtml(BUNDLE.name)}</h2>
      <div class="tag">${escapeHtml(BUNDLE.tagline)}</div>
      <div class="price-line">
        <span class="price-strike">$${BUNDLE.regularPrice.toLocaleString()}</span>
        <span class="price-final">$${BUNDLE.price.toLocaleString()}</span>
        <span class="save">You save $${BUNDLE.youSave}</span>
      </div>
    </div>

    <div class="section">
      <h3>What's included</h3>
      <div class="bundle-breakdown">
        ${rows}
        <div class="row">
          <div>Total value if purchased separately</div>
          <div class="price">$${BUNDLE.totalValue.toLocaleString()}</div>
        </div>
      </div>
    </div>

    <div class="section">
      <h3>Why the bundle makes sense for you</h3>
      <p>${escapeHtml(b.personalizedReason || "")}</p>
    </div>

    ${pageFooter(ctx, 8)}
  </div>
  `;
}

/* -------- Page 9: Add-ons, what changes, CTA -------- */
function renderPage9(ctx, content) {
  const p = content.page9 || {};
  const facts = (p.didYouKnow && p.didYouKnow.length)
    ? p.didYouKnow.map((f) => `<li>${escapeHtml(f)}</li>`).join("")
    : "";

  return `
  <div class="report-page">
    ${pageHeader("Add-ons &amp; next steps")}
    <h1 class="page-h1">Add-ons &amp; what life looks like next</h1>
    <div class="page-h1-underline"></div>

    <div class="section">
      <h3>Optional add-ons</h3>
      <p class="page-lead">${escapeHtml(p.addOnsIntro || "")}</p>
      <div class="addon-grid">
        <div class="addon-card">
          <h4>${escapeHtml(ADDONS.ozone.name)}</h4>
          <p>${escapeHtml(ADDONS.ozone.blurb)}</p>
          <div class="price-row">
            <span class="price-strike">$${ADDONS.ozone.regular.toLocaleString()}</span>
            <span class="price-final">$${ADDONS.ozone.startingAt.toLocaleString()}</span>
            <small style="color:#718096;font-size:10px;">starting at &middot; installed</small>
          </div>
        </div>
        <div class="addon-card">
          <h4>${escapeHtml(ADDONS.ro.name)}</h4>
          <p>${escapeHtml(ADDONS.ro.blurb)}</p>
          <div class="price-row">
            <span class="price-strike">$${ADDONS.ro.regular.toLocaleString()}</span>
            <span class="price-final">$${ADDONS.ro.startingAt.toLocaleString()}</span>
            <small style="color:#718096;font-size:10px;">starting at &middot; installed</small>
          </div>
        </div>
      </div>
    </div>

    <div class="section">
      <h3>What changes after install</h3>
      <p>${escapeHtml(p.whatChanges || "")}</p>
    </div>

    <div class="did-you-know">
      <h3>Did you know?</h3>
      <ul>${facts}</ul>
    </div>

    <div class="cta-box">
      <h3>Ready when you are, ${escapeHtml(firstName(ctx.customerName))}</h3>
      <p>${escapeHtml(p.callToAction || "")}</p>
      <div class="phone">${escapeHtml(COMPANY.phone)}</div>
      <small style="color:#718096;">${escapeHtml(COMPANY.name)} &middot; Spanish Fork, UT</small>
    </div>

    ${pageFooter(ctx, 9)}
  </div>
  `;
}

/* -------- Main render -------- */
function renderReport(ctx, content, photosDataUrls) {
  const sizing = calcAllSizing(ctx.people, ctx.hardness);
  return [
    renderCover(ctx, sizing),
    renderPage2(ctx, content),
    renderPage3(ctx, content),
    renderPage4(ctx, content, photosDataUrls),
    renderSystemPage(ctx, content, "proMax", sizing, 5, "System 1 of 3"),
    renderSystemPage(ctx, content, "blend", sizing, 6, "System 2 of 3"),
    renderSystemPage(ctx, content, "ultima", sizing, 7, "System 3 of 3"),
    renderBundlePage(ctx, content, sizing),
    renderPage9(ctx, content),
  ].join("");
}

function firstName(fullName) {
  if (!fullName) return "";
  // Handles "Jane & John Smith" - return "Jane" in that case
  const firstWord = fullName.split(/\s|&|,/)[0];
  return firstWord || fullName;
}

/* ============================================================= */
/* App controller - form handlers, live preview, report trigger  */
/* ============================================================= */

const state = {
  photos: [], // Array<{mediaType, base64, dataUrl}>
};

// ---------- Boot ----------
document.addEventListener("DOMContentLoaded", init);

function init() {
  buildIssuesGrid();
  bindFormEvents();
  bindReportEvents();
}

function buildIssuesGrid() {
  const grid = document.getElementById("issuesGrid");
  grid.innerHTML = WATER_ISSUES.map((issue, i) => `
    <label>
      <input type="checkbox" name="issue" value="${issue}" />
      <span>${issue}</span>
    </label>
  `).join("");
}

function bindFormEvents() {
  const form = document.getElementById("assessment-form");
  const zipInput = document.getElementById("zip");
  const hardnessInput = document.getElementById("hardness");
  const peopleInput = document.getElementById("people");
  const hardnessHint = document.getElementById("hardnessHint");

  // ZIP auto-fills hardness (and updates preview)
  zipInput.addEventListener("input", () => {
    const found = lookupHardness(zipInput.value);
    if (found != null) {
      hardnessInput.value = found;
      hardnessHint.textContent = `auto-filled from ZIP ${zipInput.value.slice(0,5)} — editable`;
    } else if (zipInput.value.length >= 5) {
      if (!hardnessInput.value) hardnessInput.value = DEFAULT_HARDNESS;
      hardnessHint.textContent = `ZIP not in table — default ${DEFAULT_HARDNESS} GPG`;
    } else {
      hardnessHint.textContent = "auto-filled from ZIP";
    }
    updateLivePreview();
  });

  hardnessInput.addEventListener("input", updateLivePreview);
  peopleInput.addEventListener("input", updateLivePreview);

  // Photo uploads
  document.getElementById("photos").addEventListener("change", handlePhotoChange);

  // Form submit
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    handleGenerate();
  });

  // Error close
  document.getElementById("errorClose").addEventListener("click", () => {
    document.getElementById("errorBox").classList.add("hidden");
  });
}

function bindReportEvents() {
  document.getElementById("backBtn").addEventListener("click", () => {
    document.getElementById("report-view").classList.add("hidden");
    document.getElementById("form-view").classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  document.getElementById("printBtn").addEventListener("click", () => {
    window.print();
  });
}

// ---------- Live preview ----------
function updateLivePreview() {
  const hardness = parseInt(document.getElementById("hardness").value, 10);
  const people = parseInt(document.getElementById("people").value, 10);
  const box = document.getElementById("sizingPreview");

  if (!hardness || !people) {
    box.classList.add("hidden");
    return;
  }

  box.classList.remove("hidden");
  const sizing = calcAllSizing(people, hardness);

  document.getElementById("sizingMath").textContent =
    `${people} × 75 gal/day × ${hardness} GPG × 7 days = ${sizing.grainsNeeded.toLocaleString()} grains/week needed`;

  const setCard = (key, sizeEl, regEl, finEl) => {
    const sz = sizing.systems[key];
    document.getElementById(sizeEl).textContent = `${sz.sizeK}K grain · installed`;
    document.getElementById(regEl).textContent = formatMoney(sz.regular);
    document.getElementById(finEl).textContent = formatMoney(sz.final);
  };
  setCard("proMax", "promaxSize", "promaxRegular", "promaxPrice");
  setCard("blend", "blendSize", "blendRegular", "blendPrice");
  setCard("ultima", "ultimaSize", "ultimaRegular", "ultimaPrice");
}

// ---------- Photo handling ----------
async function handlePhotoChange(e) {
  const files = Array.from(e.target.files || []);
  state.photos = [];
  const preview = document.getElementById("photoPreview");
  preview.innerHTML = "";

  for (const f of files.slice(0, 6)) {
    try {
      const { mediaType, base64 } = await fileToBase64(f);
      const dataUrl = `data:${mediaType};base64,${base64}`;
      state.photos.push({ mediaType, base64, dataUrl });
      const img = document.createElement("img");
      img.src = dataUrl;
      preview.appendChild(img);
    } catch (err) {
      console.error("Failed to read file", err);
    }
  }
}

// ---------- Generate report ----------
async function handleGenerate() {
  const ctx = collectForm();
  if (!ctx) return;

  showLoading("Analyzing water chemistry...");
  try {
    updateLoading("Writing your personalized report...");
    const content = await callClaudeJSON({
      systemPrompt: SYSTEM_PROMPT,
      userPrompt: buildUserPrompt(ctx),
      images: state.photos.map((p) => ({ mediaType: p.mediaType, base64: p.base64 })),
      maxTokens: 8000,
    });

    updateLoading("Laying out the report...");
    const photoDataUrls = state.photos.map((p) => p.dataUrl);
    const html = renderReport(ctx, content, photoDataUrls);
    document.getElementById("report-pages").innerHTML = html;

    // Swap views
    document.getElementById("form-view").classList.add("hidden");
    document.getElementById("report-view").classList.remove("hidden");
    window.scrollTo({ top: 0 });
  } catch (err) {
    console.error(err);
    showError(err.message || String(err));
  } finally {
    hideLoading();
  }
}

function collectForm() {
  const customerName = val("customerName");
  const address = val("address");
  const zip = val("zip");
  const techName = val("techName");
  const hardness = parseInt(val("hardness"), 10);
  const people = parseInt(val("people"), 10);
  const loop = val("loop");
  const techNotes = val("techNotes");

  if (!customerName || !address || !zip || !techName || !hardness || !people || !loop) {
    showError("Please fill in all required fields.");
    return null;
  }

  const issues = Array.from(document.querySelectorAll("input[name=issue]:checked")).map((el) => el.value);

  return {
    customerName, address, zip, techName,
    hardness, people, loop, issues, techNotes,
    hasPhotos: state.photos.length > 0,
  };
}

function val(id) {
  const el = document.getElementById(id);
  return (el && el.value || "").trim();
}

// ---------- UI helpers ----------
function showLoading(msg) {
  document.getElementById("loadingMsg").textContent = msg || "Working...";
  document.getElementById("loading").classList.remove("hidden");
}
function updateLoading(msg) {
  document.getElementById("loadingMsg").textContent = msg;
}
function hideLoading() {
  document.getElementById("loading").classList.add("hidden");
}
function showError(msg) {
  document.getElementById("errorText").textContent = msg;
  document.getElementById("errorBox").classList.remove("hidden");
}

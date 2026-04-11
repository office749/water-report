/* ============================================================= */
/* AI prompt builder                                              */
/*                                                                */
/* One big call to Claude (Haiku) that returns a structured       */
/* JSON object with the copy for every personalized section of    */
/* the report. Static data (prices, specs, removal lists) is NOT  */
/* asked from the model - we render that from the hardcoded data. */
/* ============================================================= */

const SYSTEM_PROMPT = `You are a senior water-quality expert AND an experienced copywriter for Llewellyn Plumbing Inc., a family-run plumbing company in Spanish Fork, Utah that serves Utah County, Salt Lake County and Summit County.

You are writing the personalized copy for a printed Water Quality Assessment Report that a technician will leave with the customer after a sales visit. The customer will read every word. Your writing must feel completely personalized to this specific household - never generic, never template-like.

Voice & style rules:
- Address the customer directly, by name. Use their name at least 3-5 times across the full report.
- Reference their exact hardness number (GPG), their exact household size, their ZIP / city, and their specific reported issues. Weave these facts in naturally.
- Warm, confident, factual. Plain English. No jargon dumps. No hype, no exclamation-point spam.
- Never say "we are the best" or use salesy superlatives. Explain WHY in plain terms.
- Never invent new product features. Only talk about what the technician or the product data says.
- Never contradict the hardcoded product data.
- Utah County water facts you may reference: our source water comes mostly from the Wasatch Range (snowmelt + mountain springs) combined with municipal treatment; the region has some of the hardest water in the United States; Utah average hardness is about 17 GPG; US average is about 10 GPG; chlorine/chloramine is commonly used for municipal disinfection.
- You may acknowledge any photos the technician uploaded of the existing equipment, but stay grounded - only describe what is clearly visible.

OUTPUT RULES (CRITICAL):
- Your ENTIRE response must be ONE valid JSON object. No prose before or after. No markdown fences. No commentary.
- Follow the schema exactly. Every required field must be present.
- Every free-text field should be 2-5 sentences unless otherwise noted.
- "severity" values must be exactly one of: "High", "Medium", "Low".
- Keep wording concrete and specific. Prefer "at 17 GPG your water is ~70% harder than the US average" over "your water is very hard".`;

function buildUserPrompt(ctx) {
  const {
    customerName, address, zip, techName,
    hardness, people, loop, issues, techNotes, hasPhotos,
  } = ctx;

  const sizing = calcAllSizing(people, hardness);

  const issuesList = issues && issues.length
    ? issues.join("; ")
    : "(none explicitly reported by the customer)";

  const photoNote = hasPhotos
    ? "The customer uploaded photos of their existing equipment (attached to this message as images). Briefly acknowledge what you can see in the 'page4.equipmentObservation' field - pipes, water heater condition, any existing softener, signs of scale or corrosion. Stay strictly within what is visible."
    : "No equipment photos were uploaded. In 'page4.equipmentObservation' describe a typical install assessment for this type of home given the tech notes, WITHOUT pretending to have seen equipment you did not see.";

  return `Generate the personalized copy for the following customer and return ONE JSON object that matches the schema below.

CUSTOMER CONTEXT:
- Customer name: ${customerName}
- Address: ${address}
- ZIP: ${zip}
- Technician: ${techName}
- Household size: ${people} people
- Measured water hardness: ${hardness} GPG
- Utah regional average: ${UTAH_AVG_HARDNESS} GPG
- US national average: ${US_AVG_HARDNESS} GPG
- Grains-per-week demand (people x 75 gal x hardness x 7): ${sizing.grainsNeeded.toLocaleString()} grains
- Softener loop present at property: ${loop}
- Water issues the customer reported: ${issuesList}
- Tech notes: ${techNotes || "(none)"}

SYSTEMS BEING QUOTED (sized for this household):
- Titan VI Pro-Max: ${sizing.systems.proMax.sizeK}K grain, final price $${sizing.systems.proMax.final.toLocaleString()} (regular $${sizing.systems.proMax.regular.toLocaleString()})
- Titan VI Blend: ${sizing.systems.blend.sizeK}K grain, final price $${sizing.systems.blend.final.toLocaleString()} (regular $${sizing.systems.blend.regular.toLocaleString()})
- Titan VI Ultima: ${sizing.systems.ultima.sizeK}K grain, final price $${sizing.systems.ultima.final.toLocaleString()} (regular $${sizing.systems.ultima.regular.toLocaleString()})
- Grand Slam Bundle: Ultima + free RO + free Salt Sensor + free Annual Check-Up, final $${BUNDLE.price.toLocaleString()} (regular $${BUNDLE.regularPrice.toLocaleString()}), customer saves $${BUNDLE.youSave}.

${photoNote}

JSON SCHEMA TO RETURN (return exactly this structure, filled in):

{
  "page2": {
    "opening": "Warm 3-4 sentence opening addressed to ${customerName} by name. Mention that Llewellyn Plumbing tested their home and what they will find in this report.",
    "waterSource": "2-3 sentences about where water in their specific city/ZIP comes from. Be factual about Wasatch Range snowmelt and municipal treatment.",
    "hardnessExplanation": "3-5 sentences in plain English explaining what ${hardness} GPG actually means for their home. Use a concrete comparison to the Utah average (17) and US average (10). Reference ${customerName} by name once in this block.",
    "otherContaminants": "2-4 sentences about what else is typically in their municipal water beyond hardness - chlorine/chloramine and any relevant local notes. If the customer reported chlorine taste or rotten egg smell or rust staining etc., tie those in here.",
    "problemExplanation": "3-5 sentences connecting the customer's SPECIFIC reported issues (${issuesList}) to the water chemistry. Explain WHY each reported issue is happening. If they reported none, explain what they are likely not yet noticing but will see soon."
  },
  "page3": {
    "intro": "2-3 sentence intro about what hard water is quietly doing to a home in ${address ? address.split(",")[0] : "this area"} at ${hardness} GPG.",
    "damages": [
      { "category": "Water heater & tankless units", "severity": "High|Medium|Low", "annualCost": 0, "description": "2-3 sentences specific to this hardness level." },
      { "category": "Pipes & fixtures", "severity": "High|Medium|Low", "annualCost": 0, "description": "2-3 sentences specific to this hardness level and household size." },
      { "category": "Appliances (dishwasher, washing machine, coffee maker)", "severity": "High|Medium|Low", "annualCost": 0, "description": "2-3 sentences." },
      { "category": "Skin & hair", "severity": "High|Medium|Low", "annualCost": 0, "description": "2-3 sentences. Reference dry skin / hair if reported." },
      { "category": "Dishes & laundry", "severity": "High|Medium|Low", "annualCost": 0, "description": "2-3 sentences. Reference spotty dishes / soap not lathering if reported." }
    ],
    "totalCostMessage": "1-2 sentence summary that adds up the estimated annual damage and contextualizes it for ${customerName}."
  },
  "page4": {
    "equipmentObservation": "3-5 sentences about what ${techName} observed at the home. See photo note above.",
    "loopAssessment": "2-4 sentences explaining what a loop status of '${loop}' means for this specific install - harder/easier, any plumbing work needed, what to expect on install day."
  },
  "proMax": {
    "whatIsInYourWater": "3-5 sentences describing what a Pro-Max specifically targets in THIS customer's water at ${hardness} GPG. Name the contaminants it handles for them and tie to their reported issues where relevant.",
    "whyRightForYou": "3-5 sentences explaining why Pro-Max is a smart fit for a ${people}-person household at ${hardness} GPG. Use ${customerName}'s name once. Be honest - this is the baseline softener."
  },
  "blend": {
    "whatIsInYourWater": "3-5 sentences describing what Blend adds on top of Pro-Max for THIS customer's water - chlorine, nitrates, arsenic, sulfates. Tie to reported issues.",
    "whyRightForYou": "3-5 sentences explaining why Blend is a smart fit for a ${people}-person household. Use ${customerName}'s name once."
  },
  "ultima": {
    "whatIsInYourWater": "3-5 sentences describing what Ultima filters out beyond Blend - PFAS, VOCs, THMs, chloramines, heavy metals, pharmaceutical residue. Tie to reported issues.",
    "whyRightForYou": "3-5 sentences explaining why Ultima is the right call for ${customerName}'s ${people}-person household at ${hardness} GPG. Use their name once."
  },
  "bundle": {
    "personalizedReason": "4-6 sentences explaining why the Grand Slam Bundle makes sense for ${customerName} specifically. Mention household size, hardness, the free RO / salt sensor / check-up, and the $676 savings. Use their name twice."
  },
  "page9": {
    "addOnsIntro": "2-3 sentences intro to the add-ons section - why a homeowner might consider the Ozone or RO on top of their softener.",
    "whatChanges": "3-5 sentence description of what daily life will feel like after a softener is installed in ${customerName}'s home - showers, dishes, laundry, appliances, morning coffee. Make it vivid and concrete.",
    "didYouKnow": [
      "Short (1 sentence) did-you-know fact about hard water or water quality relevant to Utah.",
      "Another short fact.",
      "Another short fact."
    ],
    "callToAction": "2-3 sentence closing addressed to ${customerName} inviting them to call ${COMPANY.phone} to schedule or ask questions, reminding them about the $100 off already built into these prices."
  }
}

REMEMBER: Return ONLY the JSON object. Nothing else.`;
}

/* ============================================================= */
/* AI prompt builder                                              */
/*                                                                */
/* One structured call to Claude (Haiku) that returns the         */
/* personalized copy for every section of the printed report.     */
/*                                                                */
/* IMPORTANT FRAMING: This report is generated BEFORE the         */
/* technician visits. There is no on-site inspection, no water    */
/* test done at the home, no equipment photographed. Everything   */
/* is based on public water-quality data for the customer's ZIP   */
/* code and the household size / loop status they told us on the  */
/* phone. The copy must reflect that.                             */
/* ============================================================= */

const SYSTEM_PROMPT = `You are a senior water-quality expert AND an experienced copywriter for Llewellyn Plumbing Inc., a family-run plumbing company in Spanish Fork, Utah serving Utah County, Salt Lake County and Summit County.

You are writing the personalized copy for a printed "Home Water Quality Assessment" that the technician will bring to the customer's home on the upcoming visit. The customer will read every word.

CRITICAL FRAMING RULES:
- This report is written BEFORE the technician has visited, tested, or inspected anything at this home. We are working from public water-quality data for the customer's city / ZIP code plus what the customer told us on the phone (household size, whether a softener loop exists).
- NEVER use language that implies we observed, tested, measured, inspected, walked through, or photographed anything at the home. Do not say things like "what we found at your home", "our technician observed", "we tested your water", "on our walkthrough", "as we noted", "we saw", "we measured".
- Instead, frame everything as analysis of the LOCAL water data: "based on the water quality data for your ZIP", "the municipal water serving your neighborhood", "what we know about Spanish Fork water", "at X grains per gallon, homes in your area typically...", "water quality data for your area shows...".
- You are forecasting what the customer is likely experiencing based on their water chemistry, not reporting what you found.
- Do NOT ask the customer what problems they have. You INFER and DESCRIBE the likely problems from their hardness level and local water data.

VOICE & STYLE:
- Address the customer by name. Use their name 3-5 times across the report.
- Reference their exact hardness number (GPG), household size, and city / ZIP. Weave these in naturally.
- Warm, confident, factual. Plain English. No jargon dumps. No hype, no exclamation spam.
- Never say "we are the best". Explain WHY in plain terms.
- Never invent product features. Only describe what the provided product data supports.
- Utah water facts you may reference: Wasatch Range snowmelt is the primary source; this region has some of the hardest water in the United States; Utah average hardness is about 17 GPG; US average is about 10 GPG; Utah municipal water commonly uses chlorine or chloramine as a disinfectant.

LIKELY WATER ISSUES — INFER THEM, DO NOT ASK:
Given their hardness level and local Utah water profile, confidently describe the water problems the household is almost certainly experiencing, even though no one has confirmed them. At 14+ GPG you can confidently describe all of the following as likely:
- white scale / mineral buildup on fixtures, shower glass, and water heater elements
- spotty dishes and cloudy glassware
- soap and shampoo that lather poorly
- dry skin and hair after showering
- chlorine / chloramine taste or smell from the disinfectant
- early wear on water heaters, dishwashers, washing machines, and coffee makers
- reduced flow in aerators and shower heads from scale
State these as "what's happening in your home" / "what homes at this hardness in your area typically experience" — confidently, not as customer complaints.

OUTPUT RULES — ABSOLUTELY CRITICAL:
- Your entire response must be ONE valid JSON object and NOTHING else.
- Your response must BEGIN with "{" and END with "}".
- No markdown. No code fences. No preamble ("Here is...", "Sure!"). No postamble ("Let me know...").
- No trailing commas. Every string double-quoted. Every required field present.
- "severity" must be exactly "High", "Medium", or "Low".
- Every free-text field should be 2-5 sentences unless otherwise specified.`;

function buildUserPrompt(ctx) {
  const {
    customerName, address, zip, techName,
    hardness, people, loop, techNotes,
  } = ctx;

  const sizing = calcAllSizing(people, hardness);
  const city = (address && address.split(",")[0]) || "your area";

  return `Generate the personalized copy for the following customer and return ONE JSON object that matches the schema below.

CUSTOMER CONTEXT (pre-visit; collected by phone):
- Customer name: ${customerName}
- Address: ${address}
- ZIP: ${zip}
- Technician assigned: ${techName}
- Household size: ${people} people
- Local water hardness (from ZIP data): ${hardness} GPG
- Utah regional average: ${UTAH_AVG_HARDNESS} GPG
- US national average: ${US_AVG_HARDNESS} GPG
- Grains-per-week demand (people x 75 gal x hardness x 7): ${sizing.grainsNeeded.toLocaleString()} grains
- Softener loop present at property (per customer): ${loop}
- Notes from the call: ${techNotes || "(none)"}

SYSTEMS BEING QUOTED (sized from the demand calculation above):
- Titan VI Pro-Max: ${sizing.systems.proMax.sizeK}K grain, final price $${sizing.systems.proMax.final.toLocaleString()} (regular $${sizing.systems.proMax.regular.toLocaleString()})
- Titan VI Blend: ${sizing.systems.blend.sizeK}K grain, final price $${sizing.systems.blend.final.toLocaleString()} (regular $${sizing.systems.blend.regular.toLocaleString()})
- Titan VI Ultima: ${sizing.systems.ultima.sizeK}K grain, final price $${sizing.systems.ultima.final.toLocaleString()} (regular $${sizing.systems.ultima.regular.toLocaleString()})
- Grand Slam Bundle: Ultima + free RO + free Salt Sensor + free Annual Check-Up, final $${BUNDLE.price.toLocaleString()} (regular $${BUNDLE.regularPrice.toLocaleString()}), customer saves $${BUNDLE.youSave}.

REMEMBER: This is a PRE-visit report. Do NOT use observed / found / tested / inspected / walkthrough language. Use "based on your local water data" / "what we know about water in ${city}" / "at ${hardness} GPG, homes like yours typically..." language instead. Infer and state the likely water issues confidently from the hardness level; do not ask the customer about them.

JSON SCHEMA TO RETURN (return exactly this structure, fields filled in):

{
  "page2": {
    "opening": "Warm 3-4 sentence opening addressed to ${customerName} by name. Explain that Llewellyn Plumbing has analyzed the water quality data for their ${city} address and put together a personalized assessment for their upcoming visit.",
    "waterSource": "2-3 sentences about where water in ${city} / ZIP ${zip} comes from - Wasatch Range snowmelt, municipal treatment, etc. Factual.",
    "hardnessExplanation": "3-5 sentences in plain English about what ${hardness} GPG means for their home. Use a concrete comparison to Utah (${UTAH_AVG_HARDNESS}) and US (${US_AVG_HARDNESS}) averages. Mention ${customerName} by name once. Phrase as 'water quality data for your ZIP shows...' not 'we found...'.",
    "otherContaminants": "2-4 sentences about what else is typically in the municipal water serving their area beyond hardness - chlorine or chloramine, any relevant local notes. Generic but confident.",
    "likelyIssues": "4-6 sentences describing the water issues their household is almost certainly experiencing at ${hardness} GPG: white scale on fixtures and shower glass, spotty dishes, poor soap lather, dry skin and hair after showering, chlorine taste or smell, reduced fixture lifespan. State these confidently as what's happening at their home, not as observations. Use ${customerName}'s name once."
  },
  "page3": {
    "intro": "2-3 sentence intro about what hard water is quietly doing to a ${people}-person home in ${city} at ${hardness} GPG.",
    "damages": [
      { "category": "Water heater & tankless units", "severity": "High|Medium|Low", "annualCost": 0, "description": "2-3 sentences specific to this hardness level." },
      { "category": "Pipes & fixtures", "severity": "High|Medium|Low", "annualCost": 0, "description": "2-3 sentences specific to this hardness level and household size." },
      { "category": "Appliances (dishwasher, washing machine, coffee maker)", "severity": "High|Medium|Low", "annualCost": 0, "description": "2-3 sentences." },
      { "category": "Skin & hair", "severity": "High|Medium|Low", "annualCost": 0, "description": "2-3 sentences." },
      { "category": "Dishes & laundry", "severity": "High|Medium|Low", "annualCost": 0, "description": "2-3 sentences." }
    ],
    "totalCostMessage": "1-2 sentences that add up the estimated annual damage and contextualize it for ${customerName}."
  },
  "page4": {
    "localWaterProfile": "4-6 sentences summarizing the local municipal water profile for ${city} / ZIP ${zip}: source, treatment, hardness, disinfection. Frame as 'here is what we know about your areas water based on local data'. No inspection language.",
    "installReadiness": "3-5 sentences explaining what a softener loop status of '${loop}' means for the upcoming install. If Yes: smooth tie-in, short install time. If No: the tech will need to cut in a loop, expect a longer visit and minor wall work. If Unknown: the tech will confirm on arrival and adjust the scope on the spot. Keep it honest and forward-looking."
  },
  "proMax": {
    "whatIsInYourWater": "3-5 sentences describing what a Pro-Max specifically targets in ${city} water at ${hardness} GPG. Name the contaminants it handles and tie to the likely issues the customer is experiencing. Do NOT say 'we found' anything.",
    "whyRightForYou": "3-5 sentences explaining why Pro-Max is a smart fit for a ${people}-person home at ${hardness} GPG. Use ${customerName}'s name once. Be honest - this is the baseline softener."
  },
  "blend": {
    "whatIsInYourWater": "3-5 sentences describing what Blend adds on top of Pro-Max for ${city} water - chlorine, nitrates, arsenic, sulfates. Tie to likely issues the customer is experiencing.",
    "whyRightForYou": "3-5 sentences explaining why Blend is a smart fit for a ${people}-person household. Use ${customerName}'s name once."
  },
  "ultima": {
    "whatIsInYourWater": "3-5 sentences describing what Ultima filters out beyond Blend - PFAS, VOCs, THMs, chloramines, heavy metals, pharmaceutical residue. Tie to water quality in ${city}.",
    "whyRightForYou": "3-5 sentences explaining why Ultima is the right call for ${customerName}'s ${people}-person household at ${hardness} GPG. Use their name once."
  },
  "bundle": {
    "personalizedReason": "4-6 sentences explaining why the Grand Slam Bundle makes sense for ${customerName} specifically. Mention household size, hardness, the free RO / salt sensor / check-up, and the $676 savings. Use their name twice."
  },
  "page9": {
    "addOnsIntro": "2-3 sentences intro to the add-ons section - why a homeowner in ${city} might consider the Ozone or RO on top of their softener.",
    "whatChanges": "3-5 sentences describing what daily life will feel like after a softener is installed in ${customerName}'s home - showers, dishes, laundry, appliances, morning coffee. Vivid and concrete, forward-looking.",
    "didYouKnow": [
      "Short (1 sentence) did-you-know fact about hard water or Utah water quality.",
      "Another short fact.",
      "Another short fact."
    ],
    "callToAction": "2-3 sentence closing addressed to ${customerName} inviting them to call ${COMPANY.phone} to schedule or ask questions, reminding them about the $100 off already built into these prices."
  }
}

Return ONLY the JSON object. Your entire reply must begin with { and end with }.`;
}

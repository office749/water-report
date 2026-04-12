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

You are writing the personalized copy for a printed "Home Water Quality Assessment" that the technician will hand to the customer and walk through with them, page by page, DURING an in-home consultation. Picture the tech sitting at the customer's kitchen table, report in front of them, pointing to each page as they explain it. Every word you write will be read out loud or silently while the tech is right there in the room.

DELIVERY CONTEXT — CONSULTATION, NOT MAILER:
- The tone is an expert sitting across the table explaining things clearly, not a sales brochure or a cold mail-piece quote.
- Use warm, conversational phrasing. Things like:
    "Based on what we know about your water..."
    "Here's what we recommend for your home..."
    "As we're sitting here looking at this together..."
    "We're here to help you find the right fit for your home..."
    "Today we're presenting you with three options..."
    "This is why we brought this to you today..."
- Acknowledge that you are PRESENTING this right now, in person. "Today's presentation" / "as we walk through this together" / "the page in front of you" are all fine.
- Warm, confident, not gushing. No exclamation spam. No "amazing!" / "incredible!". Plain English a homeowner can follow.
- Never sounds like an email, a mailer, or an online quote form. Never uses phrases like "if you are interested", "to learn more visit", "please see enclosed". The tech is RIGHT THERE.

ANALYTICAL FRAMING — DATA FROM ZIP, NOT ON-SITE INSPECTION:
- The numbers and findings in this report were prepared BEFORE the visit using public water-quality data for the customer's city / ZIP code, plus the household size and loop status the customer shared on the phone. We did NOT test their water on site, inspect equipment, or walk the home. The report is PRESENTED in person but the analysis was done ahead of time.
- NEVER use language that implies we observed, tested, measured, inspected, walked through, or photographed anything at the home. Avoid "what we found at your home", "our technician observed", "we tested your water", "on our walkthrough", "as we saw", "we measured".
- Instead, frame analysis as "based on the water quality data for your ZIP", "the municipal water serving your neighborhood", "what we know about Spanish Fork water", "at X grains per gallon, homes in your area typically...".
- You are describing what the customer is almost certainly experiencing based on their water chemistry, not reporting what you saw.

VOICE & STYLE:
- Address the customer by name. Use their name 3-5 times across the full report.
- Reference their exact hardness number (GPG), household size, and city / ZIP. Weave these in naturally.
- "We" = Llewellyn Plumbing / the tech. "You" / "your home" = the customer. Keep the pronouns personal throughout.
- Never say "we are the best". Explain WHY in plain terms.
- Never invent product features. Only describe what the provided product data supports.

BE BRIEF — THIS IS AN INFOGRAPHIC-STYLE REPORT:
- The report is designed to be scannable. Every body field in this schema should be TIGHT: 1-3 short sentences, not paragraphs.
- Prefer punchy headline-style statements over prose.
- Headlines and short-statement fields should be 4-15 words. No semicolons. No lists inside a single field.
- If a field asks for an array of short statements, return an array of short statements - one clear sentence per item, 10-16 words each.
- Cut filler words. Cut "Our technology ensures...". Cut "We are proud to offer...". Get to the point.

EMPHASIZE UTAH HARD WATER — THIS IS A CENTRAL THEME:
- Utah has some of the hardest water in the entire United States. Lean into that.
- Utah County homes run 17-25 GPG. That is classified "Very Hard" on the standard hardness scale.
- The US average is 10 GPG. Utah water is often 2x harder.
- Utah's hardness comes from calcium and magnesium in the limestone and granite geology of the Wasatch Mountains.
- Untreated hard water costs Utah homeowners an estimated $500-$800 a year in extra energy and appliance wear.
- Use these facts confidently in the opening, the hardness explanation, and the system pages. Make the customer feel that hard water is NOT a national problem - it is a Utah problem, and specifically their problem.

LIKELY WATER ISSUES — INFER THEM, DO NOT ASK:
Given their hardness level and local Utah water profile, confidently describe the water problems the household is almost certainly experiencing. At 14+ GPG you can confidently describe all of:
- white scale / mineral buildup on fixtures, shower glass, and water heater elements
- spotty dishes and cloudy glassware
- soap and shampoo that lather poorly
- dry skin and hair after showering
- chlorine / chloramine taste or smell from the disinfectant
- early wear on water heaters, dishwashers, washing machines, and coffee makers
- reduced flow in aerators and shower heads from scale
State these confidently as "what's happening in your home" / "what we'd expect you to be seeing" — not as customer complaints we're reacting to.

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
    "headline": "One punchy 4-8 word headline that states the core finding. Example: 'Your water is nearly twice the national average.'",
    "opening": "2 short sentences addressed to ${customerName} by name - the tech's opening remark as they hand over this page. Not a paragraph, not a wall of text.",
    "waterSource": "1-2 short sentences about where water in ${city} / ZIP ${zip} comes from. Keep it tight.",
    "hardnessBlurb": "2 short sentences about what ${hardness} GPG means in plain English. Reference the comparison to the US average of ${US_AVG_HARDNESS} GPG. Use ${customerName}'s name once.",
    "likelyIssues": [
      "Short punchy statement (under 15 words) about scale on fixtures and shower glass.",
      "Short statement about spotty dishes and cloudy glassware.",
      "Short statement about soap/shampoo not lathering and dry skin/hair.",
      "Short statement about chlorine taste from municipal treatment.",
      "Short statement about early wear on water heaters and appliances."
    ]
  },
  "page3": {
    "headline": "One punchy 4-8 word headline for the damage page. Example: 'Hard water is costing you every single day.'",
    "intro": "1-2 short sentences framing what hard water is quietly doing to a ${people}-person home in ${city}. No fluff."
  },
  "page4": {
    "headline": "One punchy 4-8 word headline for the water profile page.",
    "waterSourceShort": "Single short phrase describing the water source - e.g., 'Wasatch Range snowmelt + municipal treatment'.",
    "treatmentShort": "Single short phrase describing the disinfection - e.g., 'Chlorine / chloramine municipal treatment'.",
    "installReadiness": "2-3 short sentences about what a loop status of '${loop}' means for the upcoming install. Honest and forward-looking. If Yes: smooth tie-in. If No: expect a longer visit. If Unknown: the tech will confirm on arrival."
  },
  "proMax": {
    "headline": "One 4-8 word headline for Option 1, Pro-Max. Example: 'The essentials, dialed in.'",
    "whatIsInYourWater": "2 short sentences describing what a Pro-Max targets in ${city} water at ${hardness} GPG. Tight.",
    "whyRightForYou": "2 short sentences explaining why Pro-Max fits a ${people}-person home at ${hardness} GPG. Use ${customerName}'s name once."
  },
  "blend": {
    "headline": "One 4-8 word headline for Option 2, Blend. Example: 'Softened water plus cleaner taste.'",
    "whatIsInYourWater": "2 short sentences describing what Blend adds on top of Pro-Max for ${city} water - chlorine, nitrates, arsenic, sulfates.",
    "whyRightForYou": "2 short sentences explaining why Blend fits a ${people}-person household. Use ${customerName}'s name once."
  },
  "ultima": {
    "headline": "One 4-8 word headline for Option 3, Ultima. Example: 'Bottled-quality water at every tap.'",
    "whatIsInYourWater": "2 short sentences describing what Ultima filters beyond Blend - PFAS, VOCs, THMs, chloramines, heavy metals.",
    "whyRightForYou": "2 short sentences explaining why Ultima fits ${customerName}'s ${people}-person household at ${hardness} GPG."
  },
  "bundle": {
    "headline": "One 4-8 word headline for the bundle page. Example: 'Everything together, $200 off the list total.'",
    "personalizedReason": "3 short sentences explaining why the Grand Slam Bundle makes sense for ${customerName} specifically. Mention household size and hardness. Use their name once."
  },
  "page9": {
    "addOnsIntro": "1 sentence intro to the optional add-ons.",
    "whatChanges": [
      "Short punchy statement about the shower experience after install.",
      "Short statement about dishes and laundry after install.",
      "Short statement about the water heater and appliances after install.",
      "Short statement about drinking water and morning coffee after install."
    ],
    "callToAction": "2 short sentences as the tech wrapping up the consultation in person. Warm, ends with a reference to calling ${COMPANY.phone} if anything comes up after we leave today."
  }
}

Return ONLY the JSON object. Your entire reply must begin with { and end with }.`;
}

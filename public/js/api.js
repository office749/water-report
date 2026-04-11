/* ============================================================= */
/* Backend API wrapper                                            */
/*                                                                */
/* Calls the Railway proxy which forwards to the Anthropic API.   */
/* Expected server contract:                                      */
/*                                                                */
/*   POST <API_URL>                                               */
/*   Content-Type: application/json                               */
/*   Body:                                                        */
/*     {                                                          */
/*       "model": "claude-haiku-4-5-20251001",                    */
/*       "max_tokens": 8000,                                      */
/*       "system": "...",                                         */
/*       "messages": [                                            */
/*         {"role":"user","content":[                             */
/*             {"type":"image","source":{...}},                   */
/*             {"type":"text","text":"..."}                       */
/*         ]}                                                     */
/*       ]                                                        */
/*     }                                                          */
/*                                                                */
/*   Response (same shape as Anthropic messages API):             */
/*     { "content":[{"type":"text","text":"..."}], ... }          */
/*                                                                */
/* Also tolerates a minimal wrapper:                              */
/*     { "text": "..." }                                          */
/* ============================================================= */

const API_URL = "/api/water-report"; // same-origin, served by the Node server
const MODEL = "claude-haiku-4-5-20251001";

/**
 * Call Claude through the Railway proxy. Returns a string (the model text).
 * images: Array<{mediaType, base64}>
 */
async function callClaude({ systemPrompt, userPrompt, images = [], maxTokens = 8000 }) {
  const content = [];

  for (const img of images) {
    content.push({
      type: "image",
      source: {
        type: "base64",
        media_type: img.mediaType || "image/jpeg",
        data: img.base64,
      },
    });
  }
  content.push({ type: "text", text: userPrompt });

  const body = {
    model: MODEL,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content }],
  };

  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let msg = `Server responded ${res.status}`;
    try {
      const errBody = await res.json();
      msg = errBody.error || errBody.message || JSON.stringify(errBody);
    } catch (_) {
      try { msg = await res.text(); } catch (_) {}
    }
    throw new Error(msg);
  }

  const data = await res.json();

  // Accept either full Anthropic message shape or simple {text}
  if (data && typeof data.text === "string") return data.text;
  if (data && Array.isArray(data.content)) {
    return data.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
  }
  if (data && data.content && typeof data.content === "string") return data.content;

  throw new Error("Unexpected API response shape");
}

/**
 * Call Claude and attempt to parse the response as JSON.
 *
 * Claude will occasionally add preamble ("Here is the JSON:"), markdown
 * code fences, a postamble ("Let me know if you need anything..."),
 * or trailing commas. This function tries a ladder of progressively
 * more aggressive clean-ups until one parses.
 */
async function callClaudeJSON(opts) {
  const text = await callClaude(opts);

  // Strategy 1: raw parse (ideal case)
  // Strategy 2: trim + strip fences
  // Strategy 3: slice between first { and last }
  // Strategy 4: same as 3 but also strip trailing commas
  const strategies = [
    () => JSON.parse(String(text).trim()),
    () => JSON.parse(stripFences(String(text).trim())),
    () => {
      const sliced = sliceOutermostJson(stripFences(String(text)));
      if (!sliced) throw new Error("no JSON object found in response");
      return JSON.parse(sliced);
    },
    () => {
      const sliced = sliceOutermostJson(stripFences(String(text)));
      if (!sliced) throw new Error("no JSON object found in response");
      return JSON.parse(stripTrailingCommas(sliced));
    },
  ];

  let lastErr;
  for (const strategy of strategies) {
    try {
      return strategy();
    } catch (err) {
      lastErr = err;
    }
  }

  console.error("---- Could not parse JSON from model ----");
  console.error("Raw response:", text);
  console.error("Last parse error:", lastErr && lastErr.message);

  const preview = String(text).slice(0, 200).replace(/\s+/g, " ");
  throw new Error(
    "Model returned content that could not be parsed as JSON. " +
    "Try again. Response started with: " + preview
  );
}

/** Remove ```json / ``` fences anywhere in the text. */
function stripFences(text) {
  if (!text) return "";
  return String(text)
    .replace(/```(?:json|JSON)\s*/g, "")
    .replace(/```\s*/g, "")
    .trim();
}

/**
 * Find the outermost balanced {...} block in the text and return it.
 * This handles models that wrap their JSON in preamble/postamble like:
 *   "Here is the JSON you requested:\n{...}\nLet me know if..."
 * Returns null if no {...} block is present.
 */
function sliceOutermostJson(text) {
  if (!text) return null;
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) return null;
  return text.slice(first, last + 1).trim();
}

/**
 * Remove trailing commas before } or ] - a common JSON mistake from LLMs.
 * This is a naive regex but safe enough for our use case since we only
 * apply it as a last-ditch fallback.
 */
function stripTrailingCommas(jsonText) {
  return jsonText.replace(/,(\s*[}\]])/g, "$1");
}

/**
 * Read a File -> { mediaType, base64 }
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result || "";
      // Result is "data:<media>;base64,<data>"
      const match = /^data:([^;]+);base64,(.*)$/.exec(String(result));
      if (!match) return reject(new Error("Could not read file"));
      resolve({ mediaType: match[1], base64: match[2] });
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

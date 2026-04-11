/* ============================================================= */
/* Backend API wrapper                                            */
/*                                                                */
/* Calls the server (same origin) which proxies to the Anthropic  */
/* Messages API. Also parses a JSON response out of the model's   */
/* reply with a progressively-more-aggressive cleanup ladder so   */
/* preamble, markdown fences, postamble, and trailing commas      */
/* don't break report generation.                                 */
/* ============================================================= */

const API_URL = "/api/water-report"; // same-origin, served by the Node server
const MODEL = "claude-haiku-4-5-20251001";

/**
 * Call Claude through the proxy. Returns the model's text content.
 */
async function callClaude({ systemPrompt, userPrompt, maxTokens = 10000 }) {
  const body = {
    model: MODEL,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [
      { role: "user", content: [{ type: "text", text: userPrompt }] },
    ],
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
 * Call Claude and parse the response as JSON.
 *
 * Tries a ladder of cleanups in order, using the first that parses:
 *   1. raw parse
 *   2. trim + strip ```json / ``` fences anywhere
 *   3. slice between first { and last } (handles preamble / postamble)
 *   4. same as 3 + strip trailing commas
 *   5. same as 4 + replace literal newlines inside strings with \n
 *      (handles the rare case where the model includes a real newline
 *      inside a string value without escaping it)
 */
async function callClaudeJSON(opts) {
  const text = await callClaude(opts);

  const attempts = [
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
    () => {
      const sliced = sliceOutermostJson(stripFences(String(text)));
      if (!sliced) throw new Error("no JSON object found in response");
      return JSON.parse(escapeNewlinesInStrings(stripTrailingCommas(sliced)));
    },
  ];

  let lastErr;
  for (let i = 0; i < attempts.length; i++) {
    try {
      const parsed = attempts[i]();
      if (i > 0) console.info(`JSON parser: recovered using strategy ${i + 1}`);
      return parsed;
    } catch (err) {
      lastErr = err;
    }
  }

  // Full diagnostic dump to the console so the tech can see exactly
  // what came back and why it failed.
  console.error("=".repeat(60));
  console.error("Could not parse JSON from model. Full response below:");
  console.error(text);
  console.error("Last parse error:", lastErr && lastErr.message);
  console.error("=".repeat(60));

  const preview = String(text).slice(0, 240).replace(/\s+/g, " ").trim();
  throw new Error(
    "Model returned content that could not be parsed as JSON. " +
    "Click Try again. If it keeps failing, open DevTools → Console " +
    "to see the full response. First 240 chars: " + preview
  );
}

/** Remove ```json or ``` fences anywhere in the text. */
function stripFences(text) {
  if (!text) return "";
  return String(text)
    .replace(/```(?:json|JSON)\s*/g, "")
    .replace(/```\s*/g, "")
    .trim();
}

/**
 * Return the substring between the first "{" and the last "}". This is
 * the key recovery move for responses like:
 *   Here is the JSON:\n{...}\n\nLet me know if you need anything else.
 * Returns null if there's no plausible JSON object at all.
 */
function sliceOutermostJson(text) {
  if (!text) return null;
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) return null;
  return text.slice(first, last + 1).trim();
}

/** Remove trailing commas before a } or ]. */
function stripTrailingCommas(jsonText) {
  return jsonText.replace(/,(\s*[}\]])/g, "$1");
}

/**
 * Walks the text and, while inside a JSON string literal, replaces raw
 * newlines / carriage returns with their escaped forms so JSON.parse
 * doesn't choke. Last-ditch recovery only; leaves whitespace outside
 * strings alone.
 */
function escapeNewlinesInStrings(jsonText) {
  let out = "";
  let inStr = false;
  let esc = false;
  for (let i = 0; i < jsonText.length; i++) {
    const c = jsonText[i];
    if (inStr) {
      if (esc) { out += c; esc = false; continue; }
      if (c === "\\") { out += c; esc = true; continue; }
      if (c === '"')  { out += c; inStr = false; continue; }
      if (c === "\n") { out += "\\n"; continue; }
      if (c === "\r") { out += "\\r"; continue; }
      if (c === "\t") { out += "\\t"; continue; }
      out += c;
    } else {
      if (c === '"') { out += c; inStr = true; continue; }
      out += c;
    }
  }
  return out;
}

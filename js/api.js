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

const API_URL = "https://water-report-production-8fed.up.railway.app/api/water-report";
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
 * Tolerates markdown fencing around the JSON.
 */
async function callClaudeJSON(opts) {
  const text = await callClaude(opts);
  const jsonText = extractJson(text);
  try {
    return JSON.parse(jsonText);
  } catch (err) {
    console.error("Failed to parse JSON from model", text);
    throw new Error("Model returned content that was not valid JSON. Try again.");
  }
}

function extractJson(text) {
  if (!text) return "{}";
  let t = text.trim();
  // strip ```json ... ``` fences
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  }
  // Grab the first {...} block to be safe
  const first = t.indexOf("{");
  const last = t.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    t = t.slice(first, last + 1);
  }
  return t.trim();
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

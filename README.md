# Llewellyn Plumbing — Water Assessment Report Generator

Internal tool. A plumbing technician fills out the form during a sales visit,
the tool calls Claude (Haiku 4.5) through a Railway proxy, and produces a
personalized 9-page printable Water Quality Assessment Report that gets left
with the customer.

- Spanish Fork, UT
- Serves Utah County, Salt Lake County, Summit County
- Phone: (801) 899-9431

## Structure

```
/index.html            Form view + report view (single page app)
/styles.css            All styling including print CSS (letter-size pages, page breaks)
/assets/logo.svg       Brand logo (fallback)
/assets/logo.png       (Optional) drop-in replacement PNG logo
/js/data.js            Hardcoded ZIP hardness table, products, prices, bundle, add-ons
/js/sizing.js          Grain sizing math + price selection + $100 discount
/js/api.js             Railway proxy client (expects Anthropic messages shape)
/js/prompts.js         System prompt + JSON schema prompt for Claude
/js/report.js          Renderer that builds the 9-page HTML report
/js/app.js             Main controller, form events, live preview
/netlify.toml          Netlify static-site config
```

## Running locally

No build step. Serve the folder with any static server:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Or just `open index.html` in a browser (most browsers block `file://` fetch to
other origins — use a local server to actually test report generation).

## Deploying to Netlify

1. Log in to Netlify and click **Add new site → Import an existing project**.
2. Connect GitHub → pick `office749/water-report` → branch
   `claude/water-assessment-report-generator-lpeax` (or `main` once merged).
3. Netlify will pick up `netlify.toml`. Leave the build command blank.
4. Publish directory: `.` (the repo root).
5. Click **Deploy site**.

That's it — it's a static site with no build step.

## Server contract (Railway proxy)

The front end POSTs directly to:

```
https://water-report-production-8fed.up.railway.app/api/water-report
```

(Configured in `js/api.js` → `API_URL`.)

The proxy must accept the Anthropic Messages API request body **unmodified**
and forward it to `https://api.anthropic.com/v1/messages` using the
`ANTHROPIC_API_KEY` environment variable. The response is the Anthropic
response body passed through.

### Request body

```json
{
  "model": "claude-haiku-4-5-20251001",
  "max_tokens": 8000,
  "system": "<long system prompt>",
  "messages": [
    {
      "role": "user",
      "content": [
        { "type": "image", "source": { "type": "base64", "media_type": "image/jpeg", "data": "..." } },
        { "type": "text", "text": "<JSON schema prompt>" }
      ]
    }
  ]
}
```

### Response body (pass-through)

```json
{
  "content": [{ "type": "text", "text": "{\"page2\":{...},...}" }]
}
```

The client is tolerant and will also accept `{ "text": "..." }`.

### Minimal reference implementation (Node/Express)

If the Railway server needs to be (re)created, this is all it has to do:

```js
// server.js
import express from "express";
import cors from "cors";

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: "25mb" })); // room for base64 images

app.get("/", (_req, res) => res.json({ ok: true, service: "water-report" }));

app.post("/api/water-report", async (req, res) => {
  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(req.body),
    });
    const text = await upstream.text();
    res.status(upstream.status)
       .type(upstream.headers.get("content-type") || "application/json")
       .send(text);
  } catch (err) {
    res.status(500).json({ error: String(err.message || err) });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`water-report proxy on ${port}`));
```

`package.json`:

```json
{
  "name": "water-report-server",
  "type": "module",
  "scripts": { "start": "node server.js" },
  "dependencies": { "express": "^4.19.2", "cors": "^2.8.5" }
}
```

Railway environment variables:

```
ANTHROPIC_API_KEY = sk-ant-...
```

### Smoke test the proxy

```bash
curl -i https://water-report-production-8fed.up.railway.app/
curl -i -X POST \
  -H "content-type: application/json" \
  -d '{"model":"claude-haiku-4-5-20251001","max_tokens":64,"messages":[{"role":"user","content":"Say hi in one word"}]}' \
  https://water-report-production-8fed.up.railway.app/api/water-report
```

A healthy response comes back as a JSON body with a `content` array containing
one text block.

## Editing the business data

All pricing, ZIP hardness, bundle contents, etc. live in `js/data.js`. You
can tweak those values without touching anything else:

- `ZIP_HARDNESS` — Utah ZIP → GPG table used for autofill.
- `PRODUCTS.proMax / blend / ultima` — per-size price tables.
- `BUNDLE` — Grand Slam bundle contents and pricing.
- `ADDONS` — Ozone UF + RO drinking water.
- `COMPANY.discount` — the dollar amount already subtracted from prices shown
  on the report (currently $100).

## Print notes

- Page 1 (cover) fills the paper edge-to-edge.
- Pages 2-9 use 0.55 inch margins.
- Each system card is its own page, enforced with `page-break-after: always`
  and `break-inside: avoid`.
- All colored blocks have white backgrounds with colored borders so the
  printer does not chew through toner.
- Tested layouts: US Letter, portrait.

To save as PDF the tech just hits **Print / Save PDF** and picks "Save as
PDF" in their browser's print dialog.

## Replacing the logo

Drop a transparent PNG at `assets/logo.png` — the SVG fallback will stay in
place if the PNG is missing. The SVG is an approximation built from the
brand guide; the real PNG should look better on the cover.

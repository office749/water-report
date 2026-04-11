/* ============================================================= */
/* Llewellyn Plumbing - water report server                       */
/*                                                                */
/* Serves the static frontend out of /public AND proxies the      */
/* /api/water-report POST to the Anthropic Messages API.          */
/* Single Node service, designed to run on Railway.               */
/* ============================================================= */

const express = require("express");
const path = require("path");

const app = express();

// Room for base64 image uploads in the report generation request.
app.use(express.json({ limit: "25mb" }));

// Permissive CORS so the endpoint still works if called from a
// different origin during any future rollout. Same-origin calls from
// the static frontend don't strictly need this but it's harmless.
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// --------- Health check ---------
app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "water-report",
    time: new Date().toISOString(),
  });
});

// --------- Anthropic proxy ---------
app.post("/api/water-report", async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "ANTHROPIC_API_KEY environment variable is not set on the server.",
    });
  }

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(req.body),
    });

    const text = await upstream.text();
    res
      .status(upstream.status)
      .type(upstream.headers.get("content-type") || "application/json")
      .send(text);
  } catch (err) {
    console.error("proxy error:", err);
    res.status(502).json({ error: String(err.message || err) });
  }
});

// --------- Static frontend ---------
// Everything in ./public is served verbatim. index.html is the
// default document for `/`. Files outside /public (server.js,
// package.json, README, .git, node_modules) are NOT exposed.
const publicDir = path.join(__dirname, "public");
app.use(
  express.static(publicDir, {
    index: "index.html",
    extensions: ["html"],
    maxAge: "1h",
  })
);

// SPA-style fallback: any unknown GET returns index.html. This
// comes AFTER /api routes and express.static, so real files and
// the API still win.
app.get("*", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

// --------- Start ---------
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`water-report listening on port ${port}`);
});

const { createServer } = require("http");
const next = require("next");
const { initSocketServer } = require("./socket-server");

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "3000", 10);

// NOTE: Do not use the 'compression' middleware with Next.js App Router.
// It breaks streaming SSR: RSC metadata chunks (OG tags, JSON-LD, etc.) get
// dropped because compression buffers the response and truncates the stream.
// Next.js handles its own gzip/brotli via the 'compress' option in next.config.
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    // Intercept /sitemap.xml and /robots.txt to strip Next.js RSC Vary headers
    // that cause Google Search Console to reject the sitemap as unreadable
    if (req.url === "/sitemap.xml" || req.url === "/robots.txt") {
      const isSitemap = req.url === "/sitemap.xml";
      const origWriteHead = res.writeHead.bind(res);
      const origSetHeader = res.setHeader.bind(res);

      // Strip Vary header when it's set
      res.setHeader = (name, value) => {
        if (typeof name === "string" && name.toLowerCase() === "vary") return res;
        return origSetHeader(name, value);
      };

      res.writeHead = (statusCode, statusMessage, headers) => {
        // Force correct content-type and cache headers
        res.setHeader = origSetHeader; // restore for remaining calls
        if (isSitemap) {
          origSetHeader("Content-Type", "application/xml; charset=utf-8");
          origSetHeader("Cache-Control", "public, max-age=300, s-maxage=300");
        } else {
          origSetHeader("Content-Type", "text/plain; charset=utf-8");
          origSetHeader("Cache-Control", "public, max-age=300, s-maxage=300");
        }
        // Remove Vary from any headers object passed to writeHead
        if (headers && typeof headers === "object") {
          delete headers["vary"];
          delete headers["Vary"];
        }
        if (typeof statusMessage === "string") {
          return origWriteHead(statusCode, statusMessage, headers);
        }
        return origWriteHead(statusCode, statusMessage || headers);
      };
    }
    handle(req, res);
  });

  initSocketServer(httpServer);

  httpServer.listen(port, () => {
    console.log(`> AccsMarkets ready on http://localhost:${port}`);
  });
});

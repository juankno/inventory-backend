import { readFileSync } from "node:fs";
import path from "node:path";

import { Router } from "express";

const openapiPath = path.join(process.cwd(), "api/openapi.yaml");

const scalarHtml = `<!doctype html>
<html>
  <head>
    <title>Surtido API — Docs</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <script id="api-reference" data-url="/api/v1/openapi.yaml"></script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>`;

export const docsRouter = (): Router => {
  const router = Router();

  router.get("/openapi.yaml", (_req, res) => {
    res.type("application/yaml").send(readFileSync(openapiPath, "utf-8"));
  });

  router.get("/docs", (_req, res) => {
    res.type("html").send(scalarHtml);
  });

  return router;
};

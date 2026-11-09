import { readFileSync } from "node:fs";
import path from "node:path";

import { Router } from "express";

const openapiPath = path.join(process.cwd(), "api/openapi.yaml");

let openapi: string | undefined;

// Versión exacta: una actualización de Scalar no cambia la página sin que lo decidamos.
const scalarHtml = `<!doctype html>
<html>
  <head>
    <title>Surtido API — Docs</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <script id="api-reference" data-url="/api/v1/openapi.yaml"></script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.77.0"></script>
  </body>
</html>`;

export const docsRouter = (): Router => {
  const router = Router();

  router.get("/openapi.yaml", (_req, res) => {
    openapi ??= readFileSync(openapiPath, "utf-8");
    res.type("application/yaml").send(openapi);
  });

  router.get("/docs", (_req, res) => {
    res.type("html").send(scalarHtml);
  });

  return router;
};

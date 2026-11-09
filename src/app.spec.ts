import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

import type { RequestHandler } from "express";

import { createApp, type AppDependencies } from "./app.ts";

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  // Estas rutas no usan casos de uso: basta con que los routers se puedan armar.
  const requireAuth: RequestHandler = (_req, _res, next) => next();
  const app = createApp({
    requireAuth,
    auth: {},
    products: {},
    movements: {},
    inventory: {},
    reports: {},
  } as unknown as AppDependencies);
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});

describe("createApp", () => {
  it("should redirect the root to the documentation", async () => {
    const response = await fetch(`${baseUrl}/`, { redirect: "manual" });

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/api/v1/docs");
  });

  it("should only redirect GET requests", async () => {
    const response = await fetch(`${baseUrl}/`, { method: "POST", redirect: "manual" });

    expect(response.status).toBe(404);
  });

  it("should keep answering NOT_FOUND on unknown routes", async () => {
    const response = await fetch(`${baseUrl}/no-existe`, { redirect: "manual" });

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ code: "NOT_FOUND" });
  });

  it("should load an exact version of the documentation viewer", async () => {
    const response = await fetch(`${baseUrl}/api/v1/docs`);

    expect(response.status).toBe(200);
    expect(await response.text()).toMatch(/@scalar\/api-reference@\d+\.\d+\.\d+"/);
  });

  it("should serve the OpenAPI document", async () => {
    const response = await fetch(`${baseUrl}/api/v1/openapi.yaml`);

    expect(response.status).toBe(200);
    expect(await response.text()).toContain("openapi: 3.1.0");
  });
});

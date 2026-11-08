import { createApp } from "../src/app.ts";
import { buildDependencies } from "../src/container.ts";
import { loadConfig } from "../src/shared/infrastructure/config.ts";

const app = createApp(buildDependencies(loadConfig()));

export default app;

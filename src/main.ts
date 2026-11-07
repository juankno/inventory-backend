import { createApp } from "./app.ts";
import { buildDependencies } from "./container.ts";
import { loadConfig } from "./shared/infrastructure/config.ts";

const config = loadConfig();
const app = createApp(buildDependencies(config));

app.listen(config.PORT, () => {
  console.log(`API escuchando en http://localhost:${config.PORT}/api/v1`);
});

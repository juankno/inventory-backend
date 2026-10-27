import { createApp } from "./app.ts";
import { loadConfig } from "./shared/infrastructure/config.ts";

// Arranque de Express.
const config = loadConfig();
const app = createApp();

app.listen(config.PORT, () => {
  console.log(`API escuchando en http://localhost:${config.PORT}/api/v1`);
});

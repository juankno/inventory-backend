import { createApp } from "./app.ts";
import { buildDependencies } from "./container.ts";
import { loadConfig } from "./shared/infrastructure/config.ts";

const config = loadConfig();
const app = createApp(buildDependencies(config));

// Express 5 también llama aquí si no pudo abrir el puerto, por ejemplo si ya está ocupado.
app.listen(config.PORT, (error) => {
  if (error) throw error;
  console.log(`API escuchando en http://localhost:${config.PORT}/api/v1`);
});

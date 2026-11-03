import { createApp } from "./app.ts";
import { JwtTokenService } from "./modules/auth/infrastructure/jwt-token-service.ts";
import { loadConfig } from "./shared/infrastructure/config.ts";

const config = loadConfig();
const app = createApp();
const tokenService = new JwtTokenService(
  config.JWT_SECRET,
  config.JWT_EXPIRES_IN,
);

app.listen(config.PORT, () => {
  console.log(`API escuchando en http://localhost:${config.PORT}/api/v1`);
});

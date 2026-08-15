import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module";
import { configureApp, configureSwagger } from "./configure-app";

export async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>("port") || 3000;
  const nodeEnv = configService.get<string>("nodeEnv") || "development";

  configureApp(app);
  configureSwagger(app);

  await app.listen(port);

  Logger.log(`Server running on http://localhost:${port}`, "Bootstrap");
  Logger.log(`API documentation: http://localhost:${port}/api/docs`, "Bootstrap");
  Logger.log(`Environment: ${nodeEnv}`, "Bootstrap");
}

bootstrap();

import { INestApplication, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

export function configureApp(app: INestApplication): void {
  const configService = app.get(ConfigService);
  const nodeEnv = configService.get<string>("nodeEnv") || "development";

  app.setGlobalPrefix("api");
  app.enableCors({
    origin: nodeEnv === "production" ? configService.get<string>("frontendUrl") : true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
}

export function configureSwagger(app: INestApplication): void {
  const swaggerConfig = new DocumentBuilder()
    .setTitle("Streaming Backend API")
    .setDescription("Netflix-style movie streaming backend API")
    .setVersion("1.0")
    .addTag("Movies", "Movie discovery, search, and details")
    .addTag("Genres", "Genre listing and movie filtering")
    .addTag("Trending", "Trending movies")
    .addTag("Streams", "Streaming sources")
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("docs", app, document, { useGlobalPrefix: true });
}

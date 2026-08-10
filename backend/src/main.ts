import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

/**
 * AUTH-01: refuse to boot with no JWT secret. A missing/empty JWT_SECRET
 * would make @nestjs/jwt sign tokens with `undefined` - accepted silently
 * by some jsonwebtoken versions - which is a real auth bypass risk, not a
 * theoretical one. Checked before Nest even starts building the module
 * graph, so this can never be skipped by a route that forgets a guard.
 */
function assertRequiredEnv() {
  const missing = ['JWT_SECRET', 'CREDENTIALS_ENCRYPTION_KEY'].filter((key) => !process.env[key]);
  if (missing.length > 0) {
    // eslint-disable-next-line no-console
    console.error(`Missing required environment variable(s): ${missing.join(', ')}. See backend/.env.example.`);
    process.exit(1);
  }
}

async function bootstrap() {
  assertRequiredEnv();
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`quanly-ccdc backend listening on :${port}`);
}
bootstrap();

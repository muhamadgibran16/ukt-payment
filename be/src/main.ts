import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { API_PREFIX, configureApp } from './bootstrap';
import { AppConfig } from './config/configuration';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  configureApp(app);

  const config = app.get(ConfigService<AppConfig, true>);
  const port = config.get('port', { infer: true });

  if (config.get('swaggerEnabled', { infer: true })) {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('SEVIMA UKT Payment API')
        .setDescription(
          'Tagihan UKT multi-institusi + webhook payment gateway. Dokumentasi webhook: docs/WEBHOOK.md',
        )
        .setVersion('1.0')
        .addBearerAuth()
        .build(),
    );
    SwaggerModule.setup('docs', app, document);
    logger.log(`Swagger docs at /docs (port ${port})`);
  }

  await app.listen(port);
  logger.log(`Server listening on port ${port}, prefix /${API_PREFIX}`);
}

bootstrap().catch((error: unknown) => {
  new Logger('Bootstrap').error('Failed to start server', error);
  process.exit(1);
});

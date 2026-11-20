/**
 * Mục đích: Mã nguồn phục vụ khởi tạo và tiện ích dùng chung; các khối bên dưới được giữ tách biệt theo trách nhiệm.
 */
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';
import { corsOriginCallback } from './common/cors-origin';

// Khởi tạo luồng bootstrap và chuẩn bị các phụ thuộc cần thiết.
async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  app.use(json({ limit: '3mb' }));
  app.use(urlencoded({ extended: true, limit: '3mb' }));

  app.setGlobalPrefix('api');
  app.enableCors({ origin: corsOriginCallback });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Cinema Ticket API')
    .setDescription('API documentation for Cinema Ticket System')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();

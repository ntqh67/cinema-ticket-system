/**
 * Mục đích: Mã nguồn phục vụ khởi tạo và tiện ích dùng chung; các khối bên dưới được giữ tách biệt theo trách nhiệm.
 */
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';

// Khởi tạo luồng bootstrap và chuẩn bị các phụ thuộc cần thiết.
async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  app.use(json({ limit: '3mb' }));
  app.use(urlencoded({ extended: true, limit: '3mb' }));

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: (origin, callback) => {
      // Chặn luồng hiện tại khi dữ liệu hoặc điều kiện bắt buộc chưa được đáp ứng.
      if (!origin || origin === 'null') {
        callback(null, true);
        return;
      }

      // Bắt đầu khối thao tác có thể phát sinh lỗi để phần xử lý lỗi phía sau tiếp nhận.
      try {
        const url = new URL(origin);
        const isDevPort = ['3000', '5173'].includes(url.port);
        const isLocalHost = ['localhost', '127.0.0.1'].includes(url.hostname);
        const isLanHost =
          url.hostname.startsWith('192.168.') ||
          url.hostname.startsWith('10.') ||
          /^172\.(1[6-9]|2\d|3[0-1])\./.test(url.hostname);

        callback(null, isDevPort && (isLocalHost || isLanHost));
      } catch {
        callback(null, false);
      }
    },
  });
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

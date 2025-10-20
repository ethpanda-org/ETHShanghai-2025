import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for frontend
  app.enableCors({
    origin: 'http://localhost:5173',
    credentials: true,
  });

  // Swagger 配置
  const config = new DocumentBuilder()
    .setTitle('Learn NestJS API')
    .setDescription('学习 NestJS 的示例 API')
    .setVersion('1.0')
    .addTag('hello', 'Hello World 示例')
    .addTag('price', '价格相关接口')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(3000);
  console.log('应用启动成功！');
  console.log('Swagger 文档: http://localhost:3000/api');
}
bootstrap();

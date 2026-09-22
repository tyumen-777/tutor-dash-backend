import { DocumentBuilder } from '@nestjs/swagger';

export function getSwaggerConfig() {
  return new DocumentBuilder()
    .setTitle('Tutor Dash API')
    .setDescription('API documentation for Tutor Dash')
    .setVersion('1.0')
    .build();
}

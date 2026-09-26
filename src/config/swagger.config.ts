import { DocumentBuilder, type SwaggerDocumentOptions } from '@nestjs/swagger';
import { createSchema } from 'zod-openapi';

export function getSwaggerConfig() {
  return new DocumentBuilder()
    .setTitle('Tutor Dash API')
    .setDescription('API documentation for Tutor Dash')
    .setVersion('1.0')
    .build();
}

export function getSwaggerDocumentOptions(): SwaggerDocumentOptions {
  return {
    standardSchemaConverter: (schema, { schemaType }) => {
      const converted = createSchema(schema as never, {
        io: schemaType,
        openapiVersion: '3.0.0',
      });

      return {
        schema: converted.schema,
        components: converted.components,
      };
    },
  };
}

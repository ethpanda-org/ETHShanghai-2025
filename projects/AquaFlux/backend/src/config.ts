import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

dotenv.config({
  path: path.resolve(process.cwd(), '.env'),
  override: true, // Allow .env file to override existing process.env variables
});

// Define a schema for environment variables for validation and type safety.
// Use .transform() to shape the final config object, making the schema the single source of truth for structure.
const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    DATABASE_URL: z.string().url({ message: 'DATABASE_URL must be a valid URL.' }),
    JWT_SECRET: z.string().min(1, { message: 'JWT_SECRET is required.' }),
    JWT_EXPIRES_IN: z
      .string()
      .regex(/^\d+[dhms]$/, { message: "JWT_EXPIRES_IN must be a string like '7d', '24h', etc." })
      .default('7d'),
    BCRYPT_SALT_ROUNDS: z.coerce.number().int().positive().default(10),
    ALCHEMY_API_KEY: z.string().min(1, { message: 'ALCHEMY_API_KEY is required.' }),
    HTTP_PROXY: z.string().url().optional(),
  })
  .transform((env) => ({
    nodeEnv: env.NODE_ENV,
    isDevelopment: env.NODE_ENV === 'development',
    port: env.PORT,
    httpProxy: env.HTTP_PROXY,
    databaseUrl: env.DATABASE_URL,
    jwt: {
      secret: env.JWT_SECRET,
      expiresIn: env.JWT_EXPIRES_IN as import('jsonwebtoken').SignOptions['expiresIn'],
    },
    bcrypt: {
      saltRounds: env.BCRYPT_SALT_ROUNDS,
    },
    alchemy: {
      apiKey: env.ALCHEMY_API_KEY,
    },
  }));

// Parse the environment variables using the transformed schema
const parsedConfig = envSchema.safeParse(process.env);

// If parsing fails, log the errors and exit the process.
if (!parsedConfig.success) {
  console.error(
    '❌ Invalid environment variables:',
    parsedConfig.error.flatten().fieldErrors,
  );
  throw new Error('Invalid environment variables. Please check your .env file.');
}

// Export the validated and typed config object.
// This is the single source of truth for configuration in the app.
export const config = parsedConfig.data;

// Export the inferred type of the config object for use elsewhere in the app.
export type AppConfig = z.infer<typeof envSchema>;

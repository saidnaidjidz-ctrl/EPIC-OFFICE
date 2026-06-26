const { z } = require('zod');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env if present
dotenv.config();

const envSchema = z.object({
  PORT: z.preprocess((val) => (val ? Number(val) : 3000), z.number().int().positive()),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  DATABASE_URL: z.string().url().optional(),
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.preprocess((val) => (val ? Number(val) : 5432), z.number().int().positive()),
  DB_USER: z.string().default('postgres'),
  DB_PASSWORD: z.string().default('postgres'),
  DB_NAME: z.string().default('epicclub_db'),
  
  REDIS_URL: z.string().url().optional(),
  
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters long"),
  JWT_REFRESH_SECRET: z.string().min(16, "JWT_REFRESH_SECRET must be at least 16 characters long"),
  
  CORS_ALLOWED_ORIGINS: z.string().default('http://localhost:3000').transform((val) => {
    return val.split(',').map((origin) => origin.trim()).filter(Boolean);
  }),
  
  FRONTEND_URL: z.string().url('FRONTEND_URL must be a valid URL (e.g. http://localhost:3001)'),
  
  GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID is required to support OAuth authentication"),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // SMTP Email Configuration (for verification emails)
  SMTP_HOST: z.string().min(1, 'SMTP_HOST is required for sending emails'),
  SMTP_PORT: z.preprocess((val) => (val ? Number(val) : 587), z.number().int().positive()),
  SMTP_USER: z.string().min(1, 'SMTP_USER (email address) is required'),
  SMTP_PASS: z.string().min(1, 'SMTP_PASS (email password or app password) is required'),
  SMTP_FROM: z.string().email('SMTP_FROM must be a valid email address').default('noreply@epicclub.app'),

}).refine((data) => {
  // Guarantee we have either DATABASE_URL or the broken-down connection components
  return !!(data.DATABASE_URL || (data.DB_HOST && data.DB_PORT && data.DB_USER && data.DB_NAME));
}, {
  message: "Either DATABASE_URL or the separate DB connection details (DB_HOST, etc.) must be defined.",
  path: ["DATABASE_URL"]
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment configurations:\n", JSON.stringify(parsed.error.format(), null, 2));
  throw new Error("Invalid environment configuration. Please inspect environment variables.");
}

module.exports = parsed.data;

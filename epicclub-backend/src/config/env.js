const { z } = require('zod');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env if present
dotenv.config();

const envSchema = z.object({
  PORT: z.preprocess((val) => (val ? Number(val) : 3000), z.number().int().positive()),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  DATABASE_URL: z.string().url().default('postgresql://postgres.qkxxmwgdpgwakxnfyabj:SaidNaidji2006@aws-1-eu-central-1.pooler.supabase.com:6543/postgres'),
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.preprocess((val) => (val ? Number(val) : 5432), z.number().int().positive()),
  DB_USER: z.string().default('postgres'),
  DB_PASSWORD: z.string().default('postgres'),
  DB_NAME: z.string().default('epicclub_db'),
  
  REDIS_URL: z.string().url().default('rediss://default:AaSDAAIgcDE0ODFkM2I0MTU0ZGM0ODE3YjIxNzliM2M1NGM2MmIwZA@topical-kiwi-42115.upstash.io:6379'),
  
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters long").default('default_secret_for_jwt_access_token_12345'),
  JWT_REFRESH_SECRET: z.string().min(16, "JWT_REFRESH_SECRET must be at least 16 characters long").default('default_secret_for_jwt_refresh_token_12345'),
  
  CORS_ALLOWED_ORIGINS: z.string().default('http://localhost:3000,https://epicclub-frontend.vercel.app,https://epicclub-frontend-4otl7nq07-epic-office.vercel.app').transform((val) => {
    return val.split(',').map((origin) => origin.trim()).filter(Boolean);
  }),
  
  FRONTEND_URL: z.string().url('FRONTEND_URL must be a valid URL (e.g. http://localhost:3001)').default('https://epicclub-frontend.vercel.app'),
  
  GOOGLE_CLIENT_ID: z.string().default('599980788199-qbblmjtvf4feqppnd0b09h7igl5t62nm.apps.googleusercontent.com'),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // SMTP Email Configuration (for verification emails)
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.preprocess((val) => (val ? Number(val) : 587), z.number().int().positive()),
  SMTP_USER: z.string().default('test@gmail.com'),
  SMTP_PASS: z.string().default('12345678'),
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

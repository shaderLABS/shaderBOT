import { defineConfig } from 'drizzle-kit';
import type { PoolConfig } from 'pg';

export const DB_CREDENTIALS = {
    ssl: false,
    user: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD || 'postgres',
    host: process.env.PG_HOST || 'localhost',
    port: process.env.PG_PORT ? Number.parseInt(process.env.PG_PORT) : 5432,
    database: process.env.PG_DATABASE || 'shaderBOT',
} satisfies PoolConfig;

export const DRIZZLE_OUTPUT = './drizzle';

export default defineConfig({
    dialect: 'postgresql',
    schema: './src/db/schema.ts',
    out: DRIZZLE_OUTPUT,
    dbCredentials: DB_CREDENTIALS,
});

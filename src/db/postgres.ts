import { drizzle } from 'drizzle-orm/node-postgres';
import type { PoolConfig } from 'pg';
import * as schema from './schema.ts';

// TODO: switch to bun-sql after drizzle fixes their shit
// https://github.com/drizzle-team/drizzle-orm/issues/3023

export const DB_DRIZZLE_OUTPUT = './drizzle';

export const DB_CREDENTIALS = {
    ssl: false,
    user: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD || 'postgres',
    host: process.env.PG_HOST || 'localhost',
    port: process.env.PG_PORT ? Number.parseInt(process.env.PG_PORT) : 5432,
    database: process.env.PG_DATABASE || 'shaderBOT',
} satisfies PoolConfig; // satisfies Bun.SQL.Options

export const db = drizzle({
    connection: DB_CREDENTIALS,
    schema,
});

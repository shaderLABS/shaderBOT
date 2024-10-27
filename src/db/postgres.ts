import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema.ts';

export const db = drizzle({
    connection: {
        ssl: false,
        user: process.env.PG_USER || 'postgres',
        password: process.env.PG_PASSWORD || 'postgres',
        host: process.env.PG_HOST || 'localhost',
        port: process.env.PG_PORT ? Number.parseInt(process.env.PG_PORT) : 5432,
        database: process.env.PG_DATABASE || 'shaderBOT',
    },
    schema,
});

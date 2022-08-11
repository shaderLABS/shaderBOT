import { setTimeout as sleep } from 'node:timers/promises';
import pg from 'pg';
import { shutdown } from '../index.js';

export const db = new pg.Pool({
    user: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD || 'postgres',
    host: process.env.PG_HOST || 'localhost',
    port: process.env.PG_PORT ? Number.parseInt(process.env.PG_PORT) : 5432,
    database: process.env.PG_DATABASE || 'shaderBOT',
});

export async function connectPostgreSQL() {
    let retries = 5;

    while (retries) {
        try {
            await db.connect();
            console.log('Connected to PostgreSQL database.');
            break;
        } catch (error) {
            console.error(error);
            if (!--retries) return shutdown(1);

            console.log(`Retrying ${retries} more times...`);
            await sleep(5000);
        }
    }
}

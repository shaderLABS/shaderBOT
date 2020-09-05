import pg from 'pg';

export const db = new pg.Pool({
    user: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD || 'postgres',
    host: process.env.PG_HOST || 'localhost',
    port: Number(process.env.PG_PORT) || 5432,
    database: process.env.PG_DATABASE || 'shaderBOT',
});

export async function connectPostgreSQL() {
    try {
        await db.connect();
        console.log('Connected to PostgreSQL database.');
    } catch (error) {
        console.error(error);
        process.exit();
    }
}

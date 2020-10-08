import pg from 'pg';

export const db = new pg.Pool({
    user: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD || 'postgres',
    host: process.env.PG_HOST || 'localhost',
    port: Number(process.env.PG_PORT) || 5432,
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
            retries -= 1;
            console.log(`Retrying ${retries} more times...`);
            await new Promise((res) => setTimeout(res, 5000));
        }
    }
}

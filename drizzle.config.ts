import { defineConfig } from 'drizzle-kit';
import { DB_CREDENTIALS, DB_DRIZZLE_OUTPUT } from './src/db/postgres.ts';

export default defineConfig({
    dialect: 'postgresql',
    schema: './src/db/schema.ts',
    out: DB_DRIZZLE_OUTPUT,
    dbCredentials: DB_CREDENTIALS,
});

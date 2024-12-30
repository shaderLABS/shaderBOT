import { drizzle } from 'drizzle-orm/node-postgres';
import { DB_CREDENTIALS } from '../../drizzle.config.ts';
import * as schema from './schema.ts';

export const db = drizzle({
    connection: DB_CREDENTIALS,
    schema,
});

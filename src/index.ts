import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { startBot } from './bot/bot.ts';
import { db, DB_DRIZZLE_OUTPUT } from './db/postgres.ts';
import { startWebserver } from './web/server.ts';

console.log('Migrating database...');
await migrate(db, { migrationsFolder: DB_DRIZZLE_OUTPUT });

startBot();
startWebserver();

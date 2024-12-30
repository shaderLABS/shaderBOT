import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { DRIZZLE_OUTPUT } from '../drizzle.config.ts';
import { startBot } from './bot/bot.ts';
import { db } from './db/postgres.ts';
import { startWebserver } from './web/server.ts';

console.log('Migrating database...');
await migrate(db, { migrationsFolder: DRIZZLE_OUTPUT });

startBot();
startWebserver();

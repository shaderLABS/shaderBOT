import { migrate } from 'drizzle-orm/connect';
import drizzleConfig from '../drizzle.config.ts';
import { startBot } from './bot/bot.ts';
import { db } from './db/postgres.ts';
import { startWebserver } from './web/server.ts';

console.log('Migrating database...');
await migrate(db, { migrationsFolder: drizzleConfig.out! });

startBot();
startWebserver();

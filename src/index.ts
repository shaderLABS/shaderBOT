import { startBot } from './bot/bot.ts';
import { connectPostgreSQL } from './db/postgres.ts';
import { startWebserver } from './web/server.ts';

await connectPostgreSQL();

startBot();
startWebserver();

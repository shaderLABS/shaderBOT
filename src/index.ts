import { startBot } from './bot/bot.js';
import { connectPostgreSQL } from './db/postgres.js';
import { startWebserver } from './web/server.js';

await connectPostgreSQL();

startBot();
startWebserver();

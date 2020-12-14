import 'reflect-metadata';
import { startBot } from './bot/bot.js';
import { connectPostgreSQL, db } from './db/postgres.js';
import { startWebserver } from './web/server.js';

export function shutdown() {
    console.log('Shutting down...');

    db.end();
    process.exit();
}

process.on('SIGINT', shutdown);

await connectPostgreSQL();
startBot();
if (process.env.BOT_ONLY !== 'TRUE') startWebserver();

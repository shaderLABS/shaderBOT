import 'reflect-metadata';
import { startWebserver } from './web/server.js';
import { startBot } from './bot/bot.js';
import { connectPostgreSQL, db } from './db/postgres.js';

export function shutdown() {
    console.log('Shutting down...');

    db.end();
    process.exit();
}

process.on('SIGINT', shutdown);

await connectPostgreSQL();
startWebserver();
startBot();

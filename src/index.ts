import 'reflect-metadata';
import { client, startBot } from './bot/bot.js';
import { connectPostgreSQL, db } from './db/postgres.js';
import { startWebserver } from './web/server.js';

export async function shutdown() {
    console.log('Shutting down...');
    client.destroy();
    db.end();
    process.exit();
}

process.stdin.resume();
process.on('SIGINT', shutdown);
process.on('SIGUSR1', shutdown);
process.on('SIGUSR2', shutdown);
process.on('uncaughtException', shutdown);

await connectPostgreSQL();
startBot();
if (process.env.BOT_ONLY !== 'TRUE') startWebserver();

import 'reflect-metadata';
import { startBot } from './bot/bot.js';
import log from './bot/lib/log.js';
import { sleep } from './bot/lib/misc.js';
import { connectPostgreSQL, db } from './db/postgres.js';
import { startWebserver } from './web/server.js';

export function hardShutdown() {
    console.log('Shutting down...');
    db.end();
    process.exit(1);
}

export async function shutdown(code: number = 0) {
    console.log('Shutting down...');
    await sleep(500);
    db.end();
    process.exit(code);
}

process.stdin.resume();
process.on('SIGINT', hardShutdown);
process.on('SIGUSR1', hardShutdown);
process.on('SIGUSR2', hardShutdown);

process.on('uncaughtException', async (error) => {
    console.error('\x1b[31m%s\x1b[0m', 'Uncaught Exception');
    console.error(error);
    await log('```' + error + '```', 'Uncaught Exception :(');

    shutdown(1);
});
process.on('unhandledRejection', async (reason, promise) => {
    console.error('\x1b[31m%s\x1b[0m', 'Unhandled Rejection');
    console.error(promise, reason);
    await log('```' + reason + '```', 'Unhandled Rejection :(');

    shutdown(1);
});

await connectPostgreSQL();
startBot();
if (process.env.BOT_ONLY !== 'TRUE') startWebserver();

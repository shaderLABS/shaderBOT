import { startWebserver } from './web/server.js';
import { startBot } from './bot/bot.js';

export function shutdown() {
    console.log('Shutting down...');
    process.exit();
}

process.on('SIGINT', shutdown);

startWebserver();
startBot();

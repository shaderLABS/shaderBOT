import { connectPostgreSQL, db } from './shared.ts';

// Removes the table called 'expiring_juxtapose' from the database.
console.group();

await connectPostgreSQL();
await db.query(/*sql*/ `DROP TABLE "expiring_juxtapose";`);

console.log("Successfully deleted 'expiring_juxtapose' table.");

process.exit();

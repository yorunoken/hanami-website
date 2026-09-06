import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../../generated/prisma/bot/client";

import { assertSeparateDatabases, parseMariaDbConnection } from "./config";

const botDatabaseUrl = process.env.BOT_DATABASE_URL;
if (!botDatabaseUrl) throw new Error("BOT_DATABASE_URL environment variable is not set. Please provide it in your environment.");

const webDatabaseUrl = process.env.WEB_DATABASE_URL;
if (webDatabaseUrl) assertSeparateDatabases(webDatabaseUrl, botDatabaseUrl);

const botConnection = parseMariaDbConnection(botDatabaseUrl, "bot");
const botAdapter = new PrismaMariaDb(botConnection);

export const botPrisma = new PrismaClient({ adapter: botAdapter });

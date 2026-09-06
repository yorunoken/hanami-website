import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../../../node_modules/.prisma/hanami-web/client";

import { assertSeparateDatabases, parseMariaDbConnection } from "./config";

const webDatabaseUrl = process.env.WEB_DATABASE_URL;
if (!webDatabaseUrl) throw new Error("WEB_DATABASE_URL environment variable is not set. Please provide it in your environment.");

const botDatabaseUrl = process.env.BOT_DATABASE_URL;
if (botDatabaseUrl) assertSeparateDatabases(webDatabaseUrl, botDatabaseUrl);

const webConnection = parseMariaDbConnection(webDatabaseUrl, "web");
const webAdapter = new PrismaMariaDb(webConnection);

export const webPrisma = new PrismaClient({ adapter: webAdapter });

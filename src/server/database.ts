import { createPool } from "mysql2/promise";

if (!process.env.WEB_DATABASE_URL) {
    throw new Error("WEB_DATABASE_URL environment variable is not set. Please provide it in your environment.");
}

export const webDatabase = createPool({
    uri: process.env.WEB_DATABASE_URL,
    timezone: "Z",
});

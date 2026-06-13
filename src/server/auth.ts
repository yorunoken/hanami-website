import { betterAuth } from "better-auth";
import { createPool } from "mysql2/promise";

if (!process.env.WEB_DATABASE_URL) {
    throw new Error("WEB_DATABASE_URL environment variable is not set. Please provide it in your environment.");
}

export const auth = betterAuth({
    database: createPool(process.env.WEB_DATABASE_URL),
    baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
    trustedOrigins: ["http://localhost:5173", "http://localhost:3000"],
    socialProviders: {
        discord: {
            clientId: process.env.DISCORD_CLIENT_ID as string,
            clientSecret: process.env.DISCORD_CLIENT_SECRET as string,
        },
    },
});

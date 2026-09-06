import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
    schema: "prisma/web/schema.prisma",
    migrations: {
        path: "prisma/web/migrations",
    },
    datasource: {
        url: env("WEB_DATABASE_URL"),
    },
});

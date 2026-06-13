import { Elysia } from "elysia";
import { auth } from "../auth";
import mysql from "mysql2/promise";

export const osuLinkRoute = new Elysia()
    .get("/osu-link/status", async ({ request, set }) => {
        const session = await auth.api.getSession({ headers: request.headers });

        if (!session) {
            set.status = 401;
            return { error: "Unauthorized" };
        }

        if (!process.env.BOT_DATABASE_URL || !process.env.WEB_DATABASE_URL) {
            set.status = 500;
            return { error: "Server configuration error" };
        }

        const webDb = await mysql.createConnection(process.env.WEB_DATABASE_URL);
        const botDb = await mysql.createConnection(process.env.BOT_DATABASE_URL);

        try {
            // Get the Discord ID from the better-auth account table
            const [accountRows] = await webDb.execute("SELECT accountId FROM account WHERE userId = ? AND providerId = 'discord'", [session.user.id]);
            const accounts = accountRows as any[];

            if (accounts.length === 0) {
                set.status = 400;
                return { error: "No Discord account linked to this session" };
            }

            const discordId = accounts[0].accountId;

            // Check the bot's users table for a linked banchoId
            const [userRows] = await botDb.execute("SELECT banchoId FROM users WHERE id = ?", [discordId]);
            const users = userRows as any[];

            if (users.length > 0 && users[0].banchoId) {
                const banchoId = users[0].banchoId;
                let username = "Unknown osu! player";
                let avatarUrl = `https://a.ppy.sh/${banchoId}`;
                let globalRank: number | null = null;

                try {
                    // Fetch public client token from osu! API
                    const tokenRes = await fetch("https://osu.ppy.sh/oauth/token", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            client_id: process.env.OSU_CLIENT_ID,
                            client_secret: process.env.OSU_CLIENT_SECRET,
                            grant_type: "client_credentials",
                            scope: "public",
                        }),
                    });

                    if (tokenRes.ok) {
                        const tokenData = (await tokenRes.json()) as any;
                        const userRes = await fetch(`https://osu.ppy.sh/api/v2/users/${banchoId}/osu`, {
                            headers: {
                                Authorization: `Bearer ${tokenData.access_token}`,
                                Accept: "application/json",
                            },
                        });

                        if (userRes.ok) {
                            const userData = (await userRes.json()) as any;
                            username = userData.username || username;
                            avatarUrl = userData.avatar_url || avatarUrl;
                            globalRank = userData.statistics?.global_rank ?? null;
                        }
                    }
                } catch (err) {
                    console.error("Error fetching osu! player details from API:", err);
                }

                return { linked: true, banchoId, username, avatarUrl, globalRank };
            }

            return { linked: false };
        } catch (e) {
            console.error("Error checking osu! link status:", e);
            set.status = 500;
            return { error: String(e) };
        } finally {
            await webDb.end();
            await botDb.end();
        }
    })
    .delete("/osu-link/unlink", async ({ request, set }) => {
        const session = await auth.api.getSession({ headers: request.headers });

        if (!session) {
            set.status = 401;
            return { error: "Unauthorized" };
        }

        if (!process.env.BOT_DATABASE_URL || !process.env.WEB_DATABASE_URL) {
            set.status = 500;
            return { error: "Server configuration error" };
        }

        const webDb = await mysql.createConnection(process.env.WEB_DATABASE_URL);
        const botDb = await mysql.createConnection(process.env.BOT_DATABASE_URL);

        try {
            const [accountRows] = await webDb.execute("SELECT accountId FROM account WHERE userId = ? AND providerId = 'discord'", [session.user.id]);
            const accounts = accountRows as any[];

            if (accounts.length === 0) {
                set.status = 400;
                return { error: "No Discord account linked to this session" };
            }

            const discordId = accounts[0].accountId;

            await botDb.execute("UPDATE users SET banchoId = NULL WHERE id = ?", [discordId]);

            return { success: true };
        } catch (e) {
            console.error("Error unlinking osu! account:", e);
            set.status = 500;
            return { error: String(e) };
        } finally {
            await webDb.end();
            await botDb.end();
        }
    })
    .get("/osu-link/settings", async ({ request, set }) => {
        const session = await auth.api.getSession({ headers: request.headers });

        if (!session) {
            set.status = 401;
            return { error: "Unauthorized" };
        }

        if (!process.env.BOT_DATABASE_URL || !process.env.WEB_DATABASE_URL) {
            set.status = 500;
            return { error: "Server configuration error" };
        }

        const webDb = await mysql.createConnection(process.env.WEB_DATABASE_URL);
        const botDb = await mysql.createConnection(process.env.BOT_DATABASE_URL);

        try {
            const [accountRows] = await webDb.execute("SELECT accountId FROM account WHERE userId = ? AND providerId = 'discord'", [session.user.id]);
            const accounts = accountRows as any[];

            if (accounts.length === 0) {
                set.status = 400;
                return { error: "No Discord account linked to this session" };
            }

            const discordId = accounts[0].accountId;

            const [userRows] = await botDb.execute("SELECT mode, score_embeds, embed_type, score_data FROM users WHERE id = ?", [discordId]);
            const users = userRows as any[];

            if (users.length > 0) {
                return {
                    mode: users[0].mode || "osu",
                    score_embeds: users[0].score_embeds === null ? 1 : users[0].score_embeds,
                    embed_type: users[0].embed_type || "hanami",
                    score_data: users[0].score_data === null ? 0 : users[0].score_data,
                };
            }

            return {
                mode: "osu",
                score_embeds: 1,
                embed_type: "hanami",
                score_data: 0,
            };
        } catch (e) {
            console.error("Error reading osu! settings:", e);
            set.status = 500;
            return { error: String(e) };
        } finally {
            await webDb.end();
            await botDb.end();
        }
    })
    .post("/osu-link/settings", async ({ request, body, set }) => {
        const session = await auth.api.getSession({ headers: request.headers });

        if (!session) {
            set.status = 401;
            return { error: "Unauthorized" };
        }

        if (!process.env.BOT_DATABASE_URL || !process.env.WEB_DATABASE_URL) {
            set.status = 500;
            return { error: "Server configuration error" };
        }

        const webDb = await mysql.createConnection(process.env.WEB_DATABASE_URL);
        const botDb = await mysql.createConnection(process.env.BOT_DATABASE_URL);

        try {
            const [accountRows] = await webDb.execute("SELECT accountId FROM account WHERE userId = ? AND providerId = 'discord'", [session.user.id]);
            const accounts = accountRows as any[];

            if (accounts.length === 0) {
                set.status = 400;
                return { error: "No Discord account linked to this session" };
            }

            const discordId = accounts[0].accountId;
            const { mode, score_embeds, embed_type, score_data } = body as any;

            // Verify if user exists
            const [userRows] = await botDb.execute("SELECT id FROM users WHERE id = ?", [discordId]);
            const users = userRows as any[];

            if (users.length > 0) {
                await botDb.execute("UPDATE users SET mode = ?, score_embeds = ?, embed_type = ?, score_data = ? WHERE id = ?", [
                    mode || "osu",
                    score_embeds !== undefined ? score_embeds : 1,
                    embed_type || "hanami",
                    score_data !== undefined ? score_data : 0,
                    discordId,
                ]);
            } else {
                await botDb.execute("INSERT INTO users (id, mode, score_embeds, embed_type, score_data) VALUES (?, ?, ?, ?, ?)", [
                    discordId,
                    mode || "osu",
                    score_embeds !== undefined ? score_embeds : 1,
                    embed_type || "hanami",
                    score_data !== undefined ? score_data : 0,
                ]);
            }

            return { success: true };
        } catch (e) {
            console.error("Error updating osu! settings:", e);
            set.status = 500;
            return { error: String(e) };
        } finally {
            await webDb.end();
            await botDb.end();
        }
    });

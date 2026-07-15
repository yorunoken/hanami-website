# Discord bot account links

Hanami Bot can request a single-use website URL for the Discord user who runs `/link`. The website authenticates the bot request, stores only a hash of the five-minute ticket, creates or reuses the Discord-backed Better Auth identity, replaces the browser's Hanami session, and sends the user directly through osu! authorization.

## Configuration

Generate an independent 32-byte secret and configure the exact same value on the website and bot deployments:

```sh
openssl rand -hex 32
```

```env
BOT_LINK_SECRET=<generated value>
BETTER_AUTH_URL=https://hanami.yorunoken.com
```

`BOT_LINK_SECRET` is required for the internal endpoint. It must not be reused as `BETTER_AUTH_SECRET` or committed to source control.

Apply the web database migration before deploying the route:

```sh
bun run db:migrate
```

The migration creates `discordLinkTicket` and `osuOAuthState`, and adds a unique Better Auth provider/account index that prevents duplicate Discord account rows.

## Bot API contract

```http
POST /api/internal/discord-link-ticket HTTP/1.1
Host: hanami.yorunoken.com
Authorization: Bearer <BOT_LINK_SECRET>
Content-Type: application/json

{
  "discordUserId": "123456789012345678",
  "username": "yoru",
  "displayName": "yoru",
  "avatarUrl": "https://cdn.discordapp.com/avatars/123456789012345678/avatar.png"
}
```

All four fields are required. `discordUserId` is the identity anchor; names and the avatar are display-only snapshots. The avatar URL must use Discord's HTTPS CDN.

A successful response is:

```json
{
    "url": "https://hanami.yorunoken.com/api/auth/bot-link/consume?token=...",
    "expiresAt": "2026-07-15T12:05:00.000Z"
}
```

The endpoint returns `401` for a missing or incorrect bot secret, `400` for an invalid body, and `500` when a link cannot be issued. Responses include `Cache-Control: no-store`.

The bot must send `url` in an ephemeral Discord response. Do not log the URL or include it in public messages, analytics, exception text, or command metadata. Configure the link button to expire or become disabled after about five minutes. Requesting a new URL invalidates older unused URLs for that Discord user.

## Minimal bot-side TypeScript example

```ts
interface DiscordLinkTicketResponse {
    url: string;
    expiresAt: string;
}

export async function requestDiscordLinkTicket(user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string;
}): Promise<DiscordLinkTicketResponse> {
    const response = await fetch("https://hanami.yorunoken.com/api/internal/discord-link-ticket", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${process.env.BOT_LINK_SECRET}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            discordUserId: user.id,
            username: user.username,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
        }),
    });

    if (!response.ok) throw new Error(`Website link request failed with status ${response.status}`);
    return response.json() as Promise<DiscordLinkTicketResponse>;
}
```

Pass the result directly to an ephemeral button response without printing `ticket.url`.

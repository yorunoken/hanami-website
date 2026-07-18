# Canonical Hanami accounts

Better Auth `user.id` is the only canonical Hanami user ID. Better Auth’s `account` table is the only source of provider ownership and usable login methods. Hanami Web owns these tables, its authentication configuration, provider rules, and the internal account service that other Hanami systems can consume later.

Initial providers are `discord` and `osu`. Database constraints allow a provider account to belong to only one canonical user and allow a canonical user at most one account from each provider. Matching email addresses, usernames, display names, or avatars never merge accounts. Linking another provider does not update the canonical `user.name` or `user.image`.

The authenticated profile API returns only provider name, provider account ID, and link date. OAuth access tokens, refresh tokens, ID tokens, scopes, and expiry data remain private in Better Auth’s `account` table.

## OAuth callbacks

Discord:

- local: `http://localhost:3000/api/auth/callback/discord`
- production: `https://hanami.yorunoken.com/api/auth/callback/discord`

osu!:

- local: `http://localhost:3000/api/auth/oauth2/callback/osu`
- production: `https://hanami.yorunoken.com/api/auth/oauth2/callback/osu`

The osu! application requests only `identify` and uses Authorization Code flow with S256 PKCE. Its registered callback must match exactly. Use `OSU_AUTH_CLIENT_ID` and `OSU_AUTH_CLIENT_SECRET` rather than an older application registered for a different callback.

## Legacy osu! account import

Deployments with verified legacy Bot mappings should run this once before enabling osu! login for existing users:

```bash
bun run db:import-legacy-osu-accounts
```

The command requires `WEB_DATABASE_URL` and `BOT_DATABASE_URL`. Under the Web migration lock and one Web transaction, it matches Better Auth Discord `account.accountId` values to Bot `users.id`, validates `users.banchoId`, and creates a tokenless Better Auth osu! account for the same `user.id`.

The import is idempotent. It stops before writing if an osu! account belongs to another canonical user, a canonical user already has another osu! account, one legacy osu! ID maps to multiple users, or duplicate provider accounts exist. Invalid legacy IDs are skipped and reported. OAuth token fields remain null.

The feature branch previously created `userIdentity` and `botIdentitySync`. Existing copies are inert and intentionally not dropped automatically. Fresh databases do not create them. They can be removed in a later destructive cleanup migration after this account-only model has been verified.

## Temporary Bot compatibility

Normal Web startup and authentication do not require `BOT_DATABASE_URL`. When it is configured, a small best-effort adapter mirrors a Discord-plus-osu! account pair to Bot `users.banchoId`, conditionally clears it after osu! unlink, and removes the Discord-keyed Bot row after Discord unlink or Hanami account deletion. A Bot failure is safely logged and cannot roll back or reject the canonical Better Auth operation.

There is no queue, worker, retry state, or profile polling. Operators can explicitly repair the mirror from current Better Auth accounts:

```bash
bun run db:sync-bot-accounts
```

Remove this adapter after Bot stores `hanami_user_id` and resolves login methods through an authenticated internal Hanami Web contract.

# Canonical Hanami identities

Better Auth `user.id` is the only canonical Hanami user ID. The Hanami-owned `userIdentity` table projects stable provider identity and profile fields for domain consumers; provider tokens remain in Better Auth’s `account` table.

Initial providers are `discord` and `osu`. A provider subject can belong to only one canonical user, and a canonical user can have at most one identity from each provider. Matching email addresses, usernames, display names, or avatars never merge accounts.

## OAuth callbacks

Discord:

- local: `http://localhost:3000/api/auth/callback/discord`
- production: `https://hanami.yorunoken.com/api/auth/callback/discord`

osu!:

- local: `http://localhost:3000/api/auth/oauth2/callback/osu`
- production: `https://hanami.yorunoken.com/api/auth/oauth2/callback/osu`

The osu! application requests only `identify`. Its registered callback must match exactly. Use the dedicated `OSU_AUTH_CLIENT_ID` and `OSU_AUTH_CLIENT_SECRET` settings instead of reusing an application registered for the removed `/api/callback` linking flow.

## Existing-user backfill

`bun run db:migrate` creates the identity schema under the existing Web migration lock and backfills:

1. every Better Auth Discord account into a Discord domain identity;
2. the Bot `users.banchoId` into an osu! identity when the same Discord subject maps to a canonical Web user.

Malformed or empty Bot osu! IDs are skipped. Duplicate provider subjects, more than one provider subject for one canonical user, or an existing conflicting domain identity stop the backfill before identity rows are written. The command prints created, updated, skipped, and conflict counts.

`bun run db:backfill-identities` reruns the idempotent backfill under the same lock. Integration tests must provide separate disposable `TEST_DATABASE_URL` and `TEST_BOT_DATABASE_URL` databases.

## Temporary Bot compatibility

Web is authoritative. When a canonical account has both Discord and osu!, Web queues an idempotent `set_osu` mirror into Bot `users.banchoId`. Unlinking osu! queues a conditional clear, and account deletion queues Discord-keyed Bot cleanup. Canonical Web changes commit first; failed Bot work remains in `botIdentitySync` with retry state and is retried on startup and profile access.

This adapter and queue are temporary. Remove them after Bot stores `hanami_user_id` and resolves provider identities through an authenticated internal Hanami identity contract.

# Canonical Hanami identities

Better Auth `user.id` is the only canonical Hanami user ID. Better Auth’s `account` table is authoritative for usable authentication methods. The Hanami-owned `userIdentity` table is a token-free projection of the same provider ownership plus stable profile fields for domain consumers; provider tokens remain only in `account`.

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

On an empty database, startup and `bun run db:migrate` first apply the schema reported by the installed Better Auth version, then apply Hanami-owned migrations while holding the existing Web migration lock. Do not create the Better Auth tables from a separate handwritten schema.

The Hanami migration then creates the identity schema and reconciles:

1. every Better Auth Discord account into a Discord domain identity;
2. the Bot `users.banchoId` into both an osu! Better Auth account and an osu! domain identity when the same Discord subject maps to a canonical Web user.

The `20260718_reconcile_legacy_osu_auth_accounts` repair migration is additive so installations that already applied the original identity migration are repaired. Migrated account rows use normal generated IDs and null OAuth token fields. Malformed or empty Bot osu! IDs are skipped. Duplicate ownership, a different provider subject in either store, or disagreement between `account` and `userIdentity` stops reconciliation before writes. The command reports accounts created, identities created or updated, already-consistent mappings, skipped invalid mappings, and conflicts.

`bun run db:backfill-identities` reruns the idempotent reconciliation in one transaction under the same lock. Integration tests must provide separate disposable `TEST_DATABASE_URL` and `TEST_BOT_DATABASE_URL` databases.

The profile API joins these two views logically and marks a provider `canAuthenticate: true` only when both stores contain the same subject for the same canonical user. A mismatch is displayed as requiring repair and cannot be linked or unlinked through the profile.

`bun run db:diagnose-orphan-auth-users` is read-only. It reports redacted osu! placeholder users that have no session, domain identity, or Companion data and either have no Better Auth accounts or have a provider account whose domain identity is owned by another user. It never deletes rows.

## Temporary Bot compatibility

Web is authoritative. When a canonical account has both Discord and osu!, Web queues an idempotent `set_osu` mirror into Bot `users.banchoId`. Unlinking osu! queues a conditional clear, and account deletion queues Discord-keyed Bot cleanup. Canonical Web changes commit first; failed Bot work remains in `botIdentitySync` with retry state and is retried on startup and profile access.

This adapter and queue are temporary. Remove them after Bot stores `hanami_user_id` and resolves provider identities through an authenticated internal Hanami identity contract.

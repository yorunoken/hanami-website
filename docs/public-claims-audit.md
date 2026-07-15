# Public claims audit

Audited: 2026-07-16

This ledger records the sources used to check factual statements shown on Hanami's public pages and in its legal center. It separates released behavior from unpublished development work and operational facts that cannot be established from a repository.

## Source snapshots

| Surface          | Source checked                                                                                                                                                                                                   | Result                                                                                                                                                                                                                                                                                    |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hanami website   | Local web repository at `5fc2b1c`, including the pending SEO and legal worktree                                                                                                                                  | Account linking, deletion, cookie, state, and route claims were checked against implementation, migrations, tests, and installed Better Auth 1.6.18.                                                                                                                                      |
| Hanami Bot       | [`hanami-osu/bot`](https://github.com/hanami-osu/bot) at `c27cf1d`                                                                                                                                               | Commands, database fields, Redis lifetimes, log rotation, and error-channel behavior were checked against command files, Prisma schema, services, and logging code.                                                                                                                       |
| osu!guessr       | [`hanami-osu/osu-guessr`](https://github.com/hanami-osu/osu-guessr) at `5d42c9a`                                                                                                                                 | Game rules, stored records, API-key hashing, report behavior, browser storage, Auth.js defaults, Umami, and AdSense loading were checked against source and installed Auth.js code.                                                                                                       |
| Hanami Companion | [`hanami-osu/companion`](https://github.com/hanami-osu/companion), public tree `8b236ec`                                                                                                                         | The public tree contains only `LICENSE`. Tauri, tosu, WebSocket, and mocked-upload claims come from an unpublished local development worktree and are labeled that way.                                                                                                                   |
| Map Analyzer     | Published [`osu-map-analyzer 0.2.9`](https://docs.rs/osu-map-analyzer/0.2.9/osu_map_analyzer/), its crates.io archive, and [`yorunoken/osu-map-analyzer-lib`](https://github.com/yorunoken/osu-map-analyzer-lib) | The release is an Apache-2.0 Rust library with stream and jump analyzers and a `rosu-map` dependency. It has no binary target, `rosu-pp`, report API, validation API, tags, feature vectors, or JSON/JSONL/CSV export. Those broader features exist only in unpublished development work. |
| Infrastructure   | [`hanami-osu/infra`](https://github.com/hanami-osu/infra) at `d963382`                                                                                                                                           | The repository currently contains a README, not production Compose, provider, access-control, log-retention, or backup configuration. Definite claims in those areas were removed or qualified.                                                                                           |

## External sources

- Discord eligibility and third-party-app boundaries: [Discord Terms of Service](https://discord.com/terms).
- Discord collection, retention, and international processing: [Discord Privacy Policy](https://discord.com/privacy).
- osu! privacy, provider-side deletion, server geography, and minimum age: [osu! Privacy Policy](https://osu.ppy.sh/legal/en/Privacy).
- Turkish data-subject request timing: [KVKK, Rights of the Data Subject](https://www.kvkk.gov.tr/Icerik/7458/Rights-of-The-Data-Subject).
- Formal Turkish application methods and required content: [KVKK application communiqué](https://www.kvkk.gov.tr/Icerik/6638/Comminuque-On-The-Principles-And-Procedures-For-The-Request-To-Data-Controller).
- Cloudflare end-user traffic processing: [Cloudflare Privacy Policy](https://www.cloudflare.com/privacypolicy/). Live response headers for both public sites also identify Cloudflare.
- Conditional edge-security cookies: [Cloudflare cookie documentation](https://developers.cloudflare.com/fundamentals/reference/policies-compliances/cloudflare-cookies/).
- Umami's default privacy model: [Umami documentation](https://docs.umami.is/docs) and [Umami FAQ](https://docs.umami.is/docs/faq). The osu!guessr source loads a self-hosted tracker and does not call Umami's identify API.
- Google advertising consent requirements: [Google AdSense consent-management requirements](https://support.google.com/adsense/answer/13554116) and [personalized/non-personalized ads](https://support.google.com/adsense/answer/9007336).
- Auth.js cookie names and lifetimes: installed `@auth/core` source used by the audited osu!guessr lockfile. The configuration uses library defaults: a 30-day JWT session and 15-minute state and PKCE cookies.
- Better Auth cookie names and lifetimes: installed `better-auth@1.6.18` source used by this repository. The configuration uses the seven-day session default and HTTPS secure-cookie prefix.

## Community context

Reddit was treated as secondary evidence only. The original [osu!guessr announcement](https://www.reddit.com/r/osugame/comments/1iemdzy) and [mode/update post](https://www.reddit.com/r/osugame/comments/1ihqbkl) corroborate the project's public background/audio game history, but current implementation claims come from the repository and live service rather than comments or recollections.

## Operational facts and limits

- The operator's location in Türkiye and Hanami-controlled infrastructure location in Germany are operator-attested facts. They are not established by the public infrastructure repository.
- The live Hanami and osu!guessr responses identify Cloudflare. Cloudflare's global edge means a German origin does not imply every network request is processed only in Germany.
- No source-backed production backup schedule, general infrastructure-log retention period, or complete production-access roster was found. The legal text now says so instead of asserting one.
- osu!guessr loads Umami and AdSense after hydration in production. Its repository does not implement a local consent gate before those scripts. Google publisher-account consent configuration cannot be verified from source, so the cookie policy does not claim that it is present.
- The live Hanami deployment still serves the earlier single-page shell. The corrected product/legal/SEO text in this branch will not be public until this repository is deployed.

Terms such as governing law, acceptable use, licenses granted for reports, suspension rights, and warranty limitations are policy choices rather than implementation facts. They were checked for internal consistency and conflicts with the cited provider rules, but this source audit is not a legal opinion.

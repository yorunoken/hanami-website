import { siteConfig } from "@/data/site-config";
import { legalContacts } from "@/data/legal";
import { LegalDocument, LegalSection, LegalTable, type TocItem } from "./legal-document";

const toc: readonly TocItem[] = [
    { id: "controller", label: "Who operates Hanami" },
    { id: "scope", label: "Services covered" },
    { id: "data", label: "Data processed" },
    { id: "purposes", label: "Purposes and legal bases" },
    { id: "sharing", label: "Third parties" },
    { id: "retention", label: "Retention" },
    { id: "security", label: "Security" },
    { id: "rights", label: "Your choices and rights" },
    { id: "children", label: "Children" },
    { id: "changes", label: "Changes" },
    { id: "contact", label: "Contact" },
];

export default function PrivacyPolicy() {
    return (
        <LegalDocument
            title="Privacy policy"
            summary="How the Hanami website, Hanami Bot, osu!guessr, Companion prototype, and Map Analyzer process information."
            toc={toc}
        >
            <LegalSection id="controller" title="1. Who operates Hanami">
                <p>
                    Hanami is an independent community project operated by Yorunoken from Türkiye. In this policy, “Hanami”, “we”, “us”, and
                    “the operator” refer to the operator of the hosted Hanami services described below.
                </p>
                <p>
                    The operator is based in Türkiye. Hanami-controlled production infrastructure is hosted in Germany, so the operator’s
                    location and the location of the servers are not the same.
                </p>
                <p>
                    Privacy and personal-data requests can be sent to{" "}
                    <a href={`mailto:${legalContacts.privacy}`}>{legalContacts.privacy}</a>. The Discord community server is not an official
                    privacy-request channel. Do not send passwords, session cookies, OAuth tokens, API keys, or backup codes.
                </p>
            </LegalSection>

            <LegalSection id="scope" title="2. Services covered">
                <p>
                    This policy is intended to cover the Hanami ecosystem operated by the controller: this website and account area, Hanami
                    Bot on Discord, the separately hosted osu!guessr service, and networked features in the public Hanami Companion prototype.
                </p>
                <p>
                    Map Analyzer 0.2.9 is a separately distributed Rust library. The published crate parses local files and has no network
                    client dependency or command-line binary. Broader CLI and dataset work exists only in an unpublished development
                    worktree. Companion is public source but remains unreleased: local tracking and Hanami authentication are implemented,
                    while play upload is unavailable because Hanami Web does not expose a production ingestion endpoint.
                </p>
            </LegalSection>

            <LegalSection id="data" title="3. Data processed">
                <h3>Hanami website and Discord sign-in</h3>
                <ul>
                    <li>
                        Discord account ID, display name, avatar URL, provider scope, and an email address when Discord supplies one. For a
                        phone-only Discord account, Hanami stores a stable non-deliverable address under the reserved <code>.invalid</code>{" "}
                        domain required by the authentication schema; it is not treated as verified contact information or used for mail.
                    </li>
                    <li>OAuth account records, which may include Discord access or refresh tokens when Better Auth receives them.</li>
                    <li>Web session token, session dates, IP address, and user-agent string stored by Better Auth.</li>
                    <li>Short-lived OAuth verification values used to complete authentication safely.</li>
                    <li>
                        Bot-issued account links store the Discord ID, supplied name and avatar snapshot, a SHA-256 ticket hash, and
                        creation, expiry, consumption, or invalidation dates. The URL token itself is not stored.
                    </li>
                    <li>
                        Ordinary request metadata processed by Cloudflare in front of the public sites, including IP address, request and
                        device information, and security signals described in Cloudflare’s privacy policy.
                    </li>
                </ul>

                <h3>osu! linking and public profile lookup</h3>
                <ul>
                    <li>
                        The osu! user ID returned by the osu! <code>identify</code> scope is stored against the Discord ID in the bot
                        database.
                    </li>
                    <li>
                        The link-status page requests public osu! username, avatar URL, and global rank for display. Those public profile
                        fields are not written by that route.
                    </li>
                    <li>
                        The one-time osu! authorization token is used to call <code>/api/v2/me</code>; the audited callback does not persist
                        that token in Hanami’s bot database.
                    </li>
                    <li>
                        osu! authorization state is stored as a SHA-256 hash bound to the Hanami user and browser session, with creation,
                        expiry, and consumption dates.
                    </li>
                </ul>

                <h3>Immediate account deletion</h3>
                <ul>
                    <li>
                        A signed-in user may delete the website account and Discord-keyed Hanami Bot user data after a Discord sign-in from
                        approximately the last 15 minutes and deliberate typed confirmation.
                    </li>
                    <li>
                        A short-lived reauthentication challenge stores the Hanami user ID, a SHA-256 hash of a random challenge token,
                        creation and expiry dates, and reauthentication and consumption dates. OAuth tokens and session cookies are not
                        stored in that record.
                    </li>
                    <li>
                        Successful deletion removes the Better Auth user, provider link and sessions, then removes the Hanami Bot user row
                        keyed to the same Discord account. Separate osu!guessr profiles are not deleted by this action.
                    </li>
                </ul>

                <h3>Hanami Bot</h3>
                <ul>
                    <li>
                        Discord user ID, linked osu! ID, and bot preferences: default game mode, score source, embed size, and embed style.
                    </li>
                    <li>Discord guild ID, guild name, owner ID, join time, and custom command prefixes.</li>
                    <li>
                        Cached beatmap and score records, including osu! user and map IDs, game mode, mods, score, accuracy, combo, grade,
                        hit counts, state, completion time, and performance points where used by bot features.
                    </li>
                    <li>
                        Aggregate command counters keyed by command and invocation type. These database counters are not keyed to a user.
                    </li>
                    <li>
                        Operational log entries containing command name, Discord user ID and username, guild ID and name, timestamps, and
                        error details.
                    </li>
                    <li>
                        On a prefix-command failure, message content and the user/guild/channel context may be sent to a configured private
                        Discord error channel accessible to the operator and maintainers authorized to diagnose production errors.
                    </li>
                    <li>
                        Temporary Redis button state, including the initiating Discord user ID, with a one-hour code-defined lifetime;
                        in-memory command cooldowns are shorter-lived.
                    </li>
                </ul>

                <h3>osu!guessr</h3>
                <ul>
                    <li>osu! user ID, username, and avatar URL received at sign-in, plus an authentication-session cookie.</li>
                    <li>
                        Completed game records and derived statistics: mode, variant, points, streaks, totals, games played, achievements,
                        and play times. Profiles and leaderboards make some of this information public.
                    </li>
                    <li>
                        Problem reports containing osu! user ID, mapset ID, report category, free-text description, status, and timestamps.
                        Report content may also be sent to a configured Discord webhook.
                    </li>
                    <li>
                        API-key name, creation and last-used dates, and a SHA-256 hash of the key. The raw key is returned once to the user.
                    </li>
                    <li>
                        One-hour Redis game state containing the osu! user ID, current item, guesses, correctness, points, streaks, timing,
                        and game progress; short Redis locks and rate-limit counters are also used.
                    </li>
                    <li>
                        Browser preferences in local storage, locale in local storage and a cookie, game-session identifiers in session
                        storage, and theme storage supplied by next-themes.
                    </li>
                    <li>
                        Production pages load self-hosted Umami for aggregate analytics. Umami is configured to operate without analytics
                        cookies. Request and device information may be processed to derive aggregate session and location metrics; raw IP
                        addresses are not intended to be stored by the analytics service.
                    </li>
                </ul>

                <h3>Hanami Companion prototype</h3>
                <ul>
                    <li>
                        Selected beatmap, live gameplay, and attempt-state information received from a local tosu instance. Recent attempts
                        are retained in memory for the current application session and are not written to a Companion database.
                    </li>
                    <li>
                        Hanami sign-in opens the system browser and uses Authorization Code with PKCE through a temporary loopback listener.
                        The access token remains in Rust memory and the refresh token is stored in the operating system credential store.
                    </li>
                    <li>
                        Authorization codes, PKCE verifiers, and tokens are not exposed to the React interface or written to Companion
                        application files. Play upload is currently unavailable and no attempt is reported as successfully submitted.
                    </li>
                </ul>

                <h3>Technical requests and external media</h3>
                <p>
                    Account pages may load avatar images from Discord or osu! hosts. Those providers receive ordinary web-request data such
                    as IP address, user agent, requested URL, and timing when the browser contacts them.
                </p>
            </LegalSection>

            <LegalSection id="purposes" title="4. Purposes and legal bases">
                <LegalTable>
                    <thead>
                        <tr>
                            <th>Purpose</th>
                            <th>Legal basis</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>
                                Authenticate users, keep sessions, link accounts, run games, answer commands, and save requested settings.
                            </td>
                            <td>Performance of a contract or steps requested by the user.</td>
                        </tr>
                        <tr>
                            <td>Prevent abuse, secure OAuth flows, rate-limit actions, diagnose failures, and maintain availability.</td>
                            <td>Legitimate interests in operating and protecting the services.</td>
                        </tr>
                        <tr>
                            <td>Verify immediate account deletion and handle other privacy requests.</td>
                            <td>
                                Compliance with applicable legal obligations and legitimate interests in accurate, secure request handling.
                            </td>
                        </tr>
                        <tr>
                            <td>Measure aggregate osu!guessr usage and service reliability.</td>
                            <td>Legitimate interests in understanding and maintaining the service, subject to applicable law.</td>
                        </tr>
                        <tr>
                            <td>Meet binding legal obligations and respond to valid legal process.</td>
                            <td>Compliance with legal obligations.</td>
                        </tr>
                    </tbody>
                </LegalTable>
            </LegalSection>

            <LegalSection id="sharing" title="5. Third parties and international processing">
                <p>
                    Data is transmitted as needed to Discord for sign-in, bot operation, webhooks, and error reporting; to osu! for sign-in
                    and API lookups; and to Cloudflare as the public sites’ proxy and network provider. Hanami-controlled application,
                    database, Redis, and self-hosted Umami infrastructure is hosted in Germany.
                </p>
                <p>
                    The operator manages the services from Türkiye while Hanami-controlled production data is processed on infrastructure in
                    Germany. Processing may also cross other national borders because Discord, osu!, and some service providers operate
                    internationally. Third-party handling is governed by each provider’s own terms, privacy notice, and applicable transfer
                    mechanisms. The public repositories do not establish the physical location of every provider request or the operator’s
                    production-access roster.
                </p>
                <p>
                    See the providers’ own notices, including{" "}
                    <a href={siteConfig.links.discordPrivacy} target="_blank" rel="noreferrer">
                        Discord’s privacy policy
                    </a>
                    ,{" "}
                    <a href={siteConfig.links.osuPrivacy} target="_blank" rel="noreferrer">
                        osu!’s privacy policy
                    </a>
                    , and{" "}
                    <a href={siteConfig.links.cloudflarePrivacy} target="_blank" rel="noreferrer">
                        Cloudflare’s privacy policy
                    </a>
                    . Those notices do not replace Hanami’s responsibilities for its own processing.
                </p>
            </LegalSection>

            <LegalSection id="retention" title="6. Retention">
                <ul>
                    <li>
                        Hanami web’s default Better Auth session lifetime is approximately seven days. Database session and OAuth
                        verification records include expiry dates.
                    </li>
                    <li>
                        Bot file logging keeps at most 30 <code>.log</code> files in the configured directory and removes older named files
                        when a new log file is selected. No repository-backed retention period was found for container, host, Cloudflare,
                        Discord error-channel, or other operational logs.
                    </li>
                    <li>
                        Bot pagination state is configured for one hour. osu!guessr game state and item sets are configured for one hour;
                        report rate limits for ten minutes; and API-key rate-limit counters for their code-defined window.
                    </li>
                    <li>
                        osu!guessr’s Auth.js session default is approximately 30 days. Its locale cookie is configured for about one year.
                        Local-storage values remain until the user clears them or application code changes them; session storage normally
                        lasts for the browser-tab session.
                    </li>
                    <li>
                        Companion recent-attempt data remains in memory until the application exits. Its stored refresh token remains in the
                        operating system credential store until sign-out, token rejection, or removal through the operating system.
                    </li>
                    <li>
                        Account, provider-link, preference, guild, completed-game, report, and API-key metadata remain while the related
                        account or feature is active, until the user deletes or revokes them where a control exists, or until Hanami no
                        longer needs them for the service, security, or a legal obligation. Cached scores and maps are refreshed or
                        overwritten as the services operate. The source does not define a general automatic deletion schedule for these
                        database rows. The analytics service applies its configured retention settings.
                    </li>
                    <li>Short-lived account-deletion reauthentication challenges expire after approximately 15 minutes.</li>
                    <li>
                        Bot-issued account links expire after approximately five minutes; osu! authorization state expires after ten
                        minutes.
                    </li>
                </ul>
            </LegalSection>

            <LegalSection id="security" title="7. Security">
                <p>
                    Hanami uses measures visible in the audited code, including HTTP-only same-site session cookies, hashed osu!guessr API
                    keys, OAuth state or verification records, parameterized database queries, rate limits, and log redaction for common
                    secret patterns. Application configuration expects secrets in environment variables, and the repositories instruct
                    contributors not to commit production credentials. Repository inspection cannot verify every deployment control or
                    guarantee absolute security.
                </p>
            </LegalSection>

            <LegalSection id="rights" title="8. Your choices and rights">
                <p>
                    Depending on where you live, you may be entitled to request access, correction, deletion, restriction, portability, or
                    objection, and to withdraw consent where consent is used. This includes rights available under Türkiye’s Personal Data
                    Protection Law and, where it applies, the GDPR. Hanami will respond without undue delay and normally within 30 days.
                </p>
                <p>
                    Signing out only ends a session. Disconnecting osu! only clears the Discord-to-osu! link. Signed-in users can
                    immediately delete the website identity and Discord-keyed Hanami Bot account data from the{" "}
                    <a href="/profile/privacy">account privacy area</a>. Separate osu!guessr profiles and provider-side data are outside
                    that action. See the <a href="/legal/data-deletion">data deletion page</a> for details.
                </p>
                <p>
                    In-app deletion uses fresh Discord OAuth authentication bound to the signed-in Hanami user and a short-lived, single-use
                    challenge. Users who cannot sign in or need deletion outside the immediate scope may email{" "}
                    <a href={`mailto:${legalContacts.privacy}`}>{legalContacts.privacy}</a>. Public usernames or numeric provider IDs alone
                    are not sufficient; proportionate additional verification may be required. Do not email government identity documents.
                    Hanami will explain any additional information needed and normally respond within 30 days.
                </p>
                <p>
                    The privacy email is an operational contact channel. Under Türkiye’s formal KVKK application rules, an ordinary email
                    qualifies only when it was previously provided to and recorded by the controller; the rules also permit written, KEP,
                    secure-electronic-signature, mobile-signature, and purpose-built application routes. Formal KVKK applications must be
                    made in Turkish and contain the information required by the applicable communiqué. Contact Hanami first if you need an
                    appropriate formal route, and review the{" "}
                    <a href={siteConfig.links.kvkkRequests} target="_blank" rel="noreferrer">
                        KVKK application procedure
                    </a>
                    .
                </p>
                <p>
                    Some records may be anonymized rather than deleted, and justified security, abuse-prevention, or legal records may
                    remain temporarily. No source-backed backup retention schedule was found. Discord and osu! independently control
                    provider-side data, which must be managed through those providers.
                </p>
            </LegalSection>

            <LegalSection id="children" title="9. Children and eligibility">
                <p>
                    You must be at least 13 and meet any higher minimum age imposed by the law or platform rules in your region. If you are
                    old enough to use the services but not old enough to enter a binding agreement where you live, a parent or legal
                    guardian must agree to these terms on your behalf. Hanami does not knowingly provide the services to anyone below the
                    applicable minimum age.
                </p>
            </LegalSection>

            <LegalSection id="changes" title="10. Changes to this policy">
                <p>
                    Material changes will be posted on this page with a new effective date and, where appropriate, announced through the
                    website or community server before they take effect. Changes required urgently for security or law may take effect
                    sooner, with notice provided as soon as reasonably possible.
                </p>
            </LegalSection>

            <LegalSection id="contact" title="11. Contact and complaints">
                <p>
                    Privacy and personal-data requests: <a href={`mailto:${legalContacts.privacy}`}>{legalContacts.privacy}</a>. Hanami is
                    operated from Türkiye and does not publish a separate postal office. The email can be used to obtain a suitable formal
                    route; it does not replace the application methods required by law. You may also complain to the{" "}
                    <a href={siteConfig.links.kvkk} target="_blank" rel="noreferrer">
                        Turkish Personal Data Protection Authority
                    </a>{" "}
                    or another data-protection authority available to you under applicable law.
                </p>
            </LegalSection>
        </LegalDocument>
    );
}

import { siteConfig } from "@/data/site-config";
import { legalContacts } from "@/data/legal";
import { LegalDocument, LegalSection, LegalTable, OwnerConfirmation, type TocItem } from "./legal-document";

const toc: readonly TocItem[] = [
    { id: "controller", label: "Who operates Hanami" },
    { id: "scope", label: "Services covered" },
    { id: "data", label: "Data processed" },
    { id: "purposes", label: "Purposes and proposed legal bases" },
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
                    The legal name of the person or entity responsible for the hosted Hanami services is <OwnerConfirmation />. The
                    public-facing organization name is <OwnerConfirmation />. Country of establishment: <OwnerConfirmation />.
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
                    Bot on Discord, the separately hosted osu!guessr service, and any networked Hanami Companion feature if it is enabled
                    later.
                </p>
                <p>
                    Map Analyzer is currently a local Rust library and command-line tool. It reads files and writes output where the user
                    directs it; the audited implementation does not send beatmap data to Hanami. Companion is currently a local prototype
                    whose score-upload request is mocked and commented out.
                </p>
            </LegalSection>

            <LegalSection id="data" title="3. Data processed">
                <h3>Hanami website and Discord sign-in</h3>
                <ul>
                    <li>Discord account ID, display name, email address, avatar URL, and provider scope returned through Discord OAuth.</li>
                    <li>OAuth account records, which may include Discord access or refresh tokens when Better Auth receives them.</li>
                    <li>Web session token, session dates, IP address, and user-agent string stored by Better Auth.</li>
                    <li>Short-lived OAuth verification values used to complete authentication safely.</li>
                    <li>
                        Requests made to this site and infrastructure logs, if retained by the host or proxy. The exact fields and retention
                        are <OwnerConfirmation />.
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
                </ul>

                <h3>Deletion-request workflow</h3>
                <ul>
                    <li>
                        A signed-in user may create a deletion request after a Discord sign-in from approximately the last 15 minutes and
                        deliberate typed confirmation.
                    </li>
                    <li>
                        The request record contains an internal ID and user ID, a random user-facing reference, status, request,
                        reauthentication and update dates, optional completion or cancellation dates, and operator-only note or sanitized
                        failure fields.
                    </li>
                    <li>
                        A short-lived reauthentication challenge stores the Hanami user ID, a SHA-256 hash of a random challenge token,
                        creation and expiry dates, and reauthentication and consumption dates. OAuth tokens and session cookies are not
                        stored in the deletion request.
                    </li>
                    <li>
                        Signed-in users can see their own reference, status and dates. They do not receive operator notes or raw internal
                        errors. Submission revokes the user’s Hanami website sessions.
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
                        Discord error channel. The operator must confirm who can access that channel.
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
                        Problem reports containing osu! user ID, mapset ID, report category, optional free-text description, status, and
                        timestamps. Report content may also be sent to a configured Discord webhook.
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
                        Production pages load a self-hosted Umami script and Google AdSense. Their deployed settings, identifiers, cookies,
                        retention, and consent behavior require a live production audit and <OwnerConfirmation />.
                    </li>
                </ul>

                <h3>Technical requests and external media</h3>
                <p>
                    Account pages may load avatar images from Discord or osu! hosts. Those providers receive ordinary web-request data such
                    as IP address, user agent, requested URL, and timing when the browser contacts them.
                </p>
            </LegalSection>

            <LegalSection id="purposes" title="4. Purposes and proposed legal bases">
                <p>
                    The proposed bases below are drafting positions, not final legal determinations.{" "}
                    <strong>All require legal review.</strong>
                </p>
                <LegalTable>
                    <thead>
                        <tr>
                            <th>Purpose</th>
                            <th>Proposed basis</th>
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
                            <td>Verify, record, coordinate, and document privacy and deletion requests.</td>
                            <td>
                                Compliance with applicable legal obligations and legitimate interests in accurate, secure request handling.
                            </td>
                        </tr>
                        <tr>
                            <td>Optional analytics or advertising on osu!guessr.</td>
                            <td>Consent where required; otherwise a locally applicable basis must be confirmed.</td>
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
                    and API lookups; to hosting, database, Redis, proxy, DNS, and backup providers used by the operator; and to Umami
                    hosting and Google AdSense on osu!guessr.
                </p>
                <p>
                    Provider names, hosting company, server and backup countries, access roles, and processor agreements are{" "}
                    <OwnerConfirmation />. Processing may cross national borders because Discord, osu!, Google, and infrastructure providers
                    operate internationally. The transfer mechanism, if one is required, is <OwnerConfirmation />.
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
                    <a href={siteConfig.links.googlePrivacy} target="_blank" rel="noreferrer">
                        Google’s privacy policy
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
                        when a new log file is selected. Container, proxy, console, and backup copies may follow different rules:{" "}
                        <OwnerConfirmation />.
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
                        Retention for web accounts, OAuth account records, bot users and preferences, guild records, cached scores/maps,
                        completed osu!guessr games, reports, API-key metadata, analytics, advertising data, infrastructure logs, and backups
                        is <OwnerConfirmation />.
                    </li>
                    <li>
                        The deletion-request record remains after submission so operators can coordinate status, partial failures, and
                        completion. Retention of completed, cancelled, rejected, or failed request records is <OwnerConfirmation />.
                    </li>
                </ul>
            </LegalSection>

            <LegalSection id="security" title="7. Security">
                <p>
                    Hanami uses measures visible in the audited code, including HTTP-only same-site session cookies, hashed osu!guessr API
                    keys, OAuth state or verification records, parameterized database queries, rate limits, and log redaction for common
                    secret patterns. No online service can guarantee absolute security. Infrastructure controls, encryption at rest, backup
                    protection, incident response, and administrator access rules are <OwnerConfirmation />.
                </p>
            </LegalSection>

            <LegalSection id="rights" title="8. Your choices and rights">
                <p>
                    Depending on where you live, you may be entitled to request access, correction, deletion, restriction, portability, or
                    objection, and to withdraw consent where consent is used. The available legal rights and response deadline depend on the
                    confirmed controller and governing law.
                </p>
                <p>
                    Signing out only ends a session. Disconnecting osu! only clears the Discord-to-osu! link. Neither action deletes data
                    held by Discord or osu!, and neither is a complete Hanami deletion. Signed-in users may submit and track a request from
                    the <a href="/profile/privacy">account privacy area</a>. Processing remains manual across services; the request itself
                    does not automatically delete every record. See the <a href="/legal/data-deletion">data deletion page</a> for details.
                </p>
                <p>
                    In-app deletion requests use fresh Discord OAuth authentication bound to the signed-in Hanami user and a short-lived,
                    single-use challenge. Users who cannot sign in may email{" "}
                    <a href={`mailto:${legalContacts.privacy}`}>{legalContacts.privacy}</a>. Public usernames or numeric provider IDs alone
                    are not sufficient; proportionate additional verification may be required. The lost-account procedure and expected
                    response period are <OwnerConfirmation />.
                </p>
                <p>
                    Some records may be anonymized rather than deleted, and justified security, abuse-prevention, legal, or backup records
                    may remain temporarily. Discord and osu! independently control provider-side data, which must be managed through those
                    providers.
                </p>
            </LegalSection>

            <LegalSection id="children" title="9. Children and eligibility">
                <p>
                    The minimum age for Hanami is <OwnerConfirmation /> and whether parental permission is accepted is <OwnerConfirmation />
                    . Users must also meet the age and eligibility rules of Discord and osu! in their region. Hanami should not knowingly
                    collect children’s data outside the confirmed rules.
                </p>
            </LegalSection>

            <LegalSection id="changes" title="10. Changes to this policy">
                <p>
                    Material changes should be posted on this page with a new date and, where appropriate, announced through the website or
                    community server. The notice period and method are <OwnerConfirmation />.
                </p>
            </LegalSection>

            <LegalSection id="contact" title="11. Contact and complaints">
                <p>
                    Privacy and personal-data requests: <a href={`mailto:${legalContacts.privacy}`}>{legalContacts.privacy}</a>
                    . Postal controller details remain <OwnerConfirmation />. Users may also have the right to complain to a local
                    data-protection authority; the lead authority cannot be identified until the controller’s establishment is confirmed.
                </p>
            </LegalSection>
        </LegalDocument>
    );
}

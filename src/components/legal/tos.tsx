import { legalContacts } from "@/data/legal";
import { LegalDocument, LegalSection, type TocItem } from "./legal-document";

const toc: readonly TocItem[] = [
    { id: "acceptance", label: "Acceptance" },
    { id: "scope", label: "Service scope" },
    { id: "eligibility", label: "Eligibility and accounts" },
    { id: "conduct", label: "Responsibilities and prohibited use" },
    { id: "third-parties", label: "Third-party platforms and data" },
    { id: "availability", label: "Availability and unfinished features" },
    { id: "content", label: "Reports, feedback, and contributions" },
    { id: "ip", label: "Intellectual property and open source" },
    { id: "termination", label: "Suspension and termination" },
    { id: "disclaimers", label: "Disclaimers" },
    { id: "liability", label: "Liability" },
    { id: "law", label: "Governing law" },
    { id: "changes", label: "Changes and contact" },
];

export default function TermsOfService() {
    return (
        <LegalDocument
            title="Terms of service"
            summary="Terms for the hosted Hanami website, Hanami Bot, and osu!guessr service, with clear boundaries for open-source code and prototypes."
            toc={toc}
        >
            <LegalSection id="acceptance" title="1. Acceptance">
                <p>
                    These terms form an agreement between you and Yorunoken, the independent operator of Hanami in Türkiye. By using a
                    hosted Hanami service after these terms become effective, you agree to them. If you do not agree, do not use the hosted
                    services.
                </p>
            </LegalSection>

            <LegalSection id="scope" title="2. Service scope">
                <p>
                    The hosted services include this website and account area, Hanami Bot on Discord, and osu!guessr. Hanami Companion is a
                    public-source but unreleased local prototype, and Map Analyzer is a separately distributed Rust library. Repository code,
                    locally run copies, and third-party platforms are subject to their own licenses and terms.
                </p>
                <p>
                    Hanami provides osu!-related lookups, Discord commands, a beatmap guessing game, account-linking and preference tools,
                    public rankings, issue-reporting features, immediate deletion for the website and Discord-keyed Bot account data, and a
                    privacy-contact path for other records.
                </p>
            </LegalSection>

            <LegalSection id="eligibility" title="3. Eligibility and linked accounts">
                <p>
                    You must be at least 13 and meet any higher minimum age imposed by law or the platform rules in your region. If you are
                    old enough to use the services but not old enough to enter a binding agreement where you live, your parent or legal
                    guardian must agree to these terms on your behalf. You must also satisfy Discord’s and osu!’s eligibility requirements
                    for features that use those platforms.
                </p>
                <p>
                    You are responsible for the security of your Discord and osu! accounts and any osu!guessr API key. You may link only
                    accounts you are authorized to control. Linking lets Hanami associate provider IDs; it does not transfer ownership of
                    either provider account.
                </p>
            </LegalSection>

            <LegalSection id="conduct" title="4. Responsibilities and prohibited use">
                <p>
                    You must use the services lawfully and in a way that does not harm other users, the operator, or third-party systems.
                    You must not:
                </p>
                <ul>
                    <li>abuse commands, spam channels, evade rate limits, or automate requests beyond documented API behavior;</li>
                    <li>scrape private or restricted data, harvest identifiers, or build unauthorized datasets from the services;</li>
                    <li>
                        probe, attack, overload, disrupt, reverse engineer security controls, or gain unauthorized access to accounts,
                        databases, hosts, or networks;
                    </li>
                    <li>
                        submit malicious code, payloads, links, or report descriptions, or exploit an error for purposes other than
                        responsible disclosure;
                    </li>
                    <li>
                        impersonate another person, misrepresent account ownership, or use the services to violate Discord, osu!, or other
                        applicable terms;
                    </li>
                    <li>infringe intellectual-property, privacy, publicity, or other rights.</li>
                </ul>
            </LegalSection>

            <LegalSection id="third-parties" title="5. Third-party platforms and externally sourced data">
                <p>
                    Discord and osu! are independent services. Their availability, policies, API limits, account actions, and data can
                    change without Hanami’s control. Use of their services remains subject to their terms.
                </p>
                <p>
                    Player profiles, scores, beatmap metadata, artwork, audio, rankings, and other osu!-sourced data may be delayed,
                    incomplete, removed, or inaccurate. Hanami does not guarantee that externally sourced data is current or suitable for
                    official ranking, moderation, or competitive decisions.
                </p>
            </LegalSection>

            <LegalSection id="availability" title="6. Availability, beta features, and changes">
                <p>
                    The services are community-run and may be changed, limited, interrupted, or discontinued. No uptime or support-response
                    commitment applies unless the operator publishes one separately.
                </p>
                <p>
                    Features marked prototype, beta, experimental, planned, or unfinished may be incomplete, lose data, change format, or
                    never be released. Companion implements local tracking and Hanami authentication, but play upload is not currently
                    operational. The operator may modify or retire products and integrations, with reasonable notice where practical.
                </p>
                <p>
                    Signed-in account deletion immediately removes the website identity and Discord-keyed Hanami Bot account data described
                    in the privacy notice. Separate osu!guessr profiles, provider-side records, and operational logs may require separate
                    action or temporary retention as described in the privacy and deletion notices. The repositories do not document a
                    production backup-retention schedule.
                </p>
            </LegalSection>

            <LegalSection id="content" title="7. Reports, feedback, and contributions">
                <p>
                    osu!guessr supports user-submitted catalog reports with a free-text description. You keep any rights you have in the
                    text you submit and grant the operator a non-exclusive, worldwide, royalty-free license to store, review, reproduce, and
                    share it only as reasonably needed to investigate and resolve the report, operate the service, and maintain an audit
                    trail.
                </p>
                <p>
                    Do not include secrets or unnecessary personal data in reports. Report text may be sent to a configured Discord webhook
                    and reviewed by authorized maintainers.
                </p>
                <p>
                    Feedback may be used without an obligation to compensate you. Code, documentation, artwork, or other contributions are
                    governed by the contribution terms and license of the relevant repository; submitting a contribution does not
                    automatically assign ownership unless a separate agreement says so.
                </p>
            </LegalSection>

            <LegalSection id="ip" title="8. Intellectual property and open-source software">
                <p>
                    Yorunoken and the relevant contributors—not “Hanami Bot” as a software object—hold rights in original branding, artwork,
                    hosted-service presentation, and code to the extent those rights exist. Hanami does not claim that a name or mark is
                    registered unless it is expressly identified as registered.
                </p>
                <p>
                    Source code published in a repository is licensed under the license in that repository. Map Analyzer, for example, is
                    published under Apache-2.0. Open-source permission to use code does not grant a right to use Hanami names, artwork,
                    third-party osu! assets, service credentials, hosted databases, or the hosted service itself beyond the applicable
                    license and law.
                </p>
                <p>
                    osu!, Discord, and third-party names, marks, artwork, audio, and data remain the property of their respective owners.
                    Hanami is an independent community project and is not endorsed by ppy Pty Ltd.
                </p>
            </LegalSection>

            <LegalSection id="termination" title="9. Suspension and termination">
                <p>
                    The operator may restrict or suspend access when reasonably necessary to prevent abuse, protect users or infrastructure,
                    comply with law or provider requirements, investigate an incident, or enforce these terms. Where practical, the operator
                    should provide a reason and a way to ask for review.
                </p>
                <p>
                    You may stop using the services at any time. Signing out, unlinking osu!, removing the bot from a server, and requesting
                    deletion have different effects; see the <a href="/legal/data-deletion">data deletion page</a>.
                </p>
            </LegalSection>

            <LegalSection id="disclaimers" title="10. Disclaimers">
                <p>
                    To the extent permitted by applicable law, the hosted services are provided “as available” and without implied
                    warranties that can legally be excluded. The operator does not promise uninterrupted operation, error-free results,
                    permanent storage, compatibility with provider changes, or accuracy of third-party data. Nothing in these terms excludes
                    rights or warranties that applicable consumer law does not allow the operator to exclude.
                </p>
            </LegalSection>

            <LegalSection id="liability" title="11. Limitation of liability">
                <p>
                    To the extent permitted by applicable law, the operator will not be liable for indirect or consequential losses arising
                    from use of or inability to use the services, loss of data, provider outages, or unauthorized account use. Nothing in
                    these terms excludes or limits liability that cannot lawfully be excluded or limited, including liability for fraud,
                    intentional misconduct, or mandatory consumer protections.
                </p>
            </LegalSection>

            <LegalSection id="law" title="12. Governing law and disputes">
                <p>
                    These terms are governed by the laws of Türkiye. Before filing a claim, please contact{" "}
                    <a href={`mailto:${legalContacts.legal}`}>{legalContacts.legal}</a> so the parties can try to resolve the issue
                    informally. Subject to any mandatory consumer venue or other protections available where you live, disputes will be
                    submitted to the competent courts of Istanbul, Türkiye. These terms do not require arbitration.
                </p>
            </LegalSection>

            <LegalSection id="changes" title="13. Changes and contact">
                <p>
                    Material changes will be posted with a new effective date and, where appropriate, announced through the website or
                    community server before they take effect. Security- or law-driven changes may take effect sooner. Continued use after
                    the new effective date means you accept the updated terms; if you object, stop using the hosted services.
                </p>
                <p>
                    Terms questions and general legal notices: <a href={`mailto:${legalContacts.legal}`}>{legalContacts.legal}</a>.
                    Personal-data and privacy requests must instead be sent to{" "}
                    <a href={`mailto:${legalContacts.privacy}`}>{legalContacts.privacy}</a>. The Discord community server is not an official
                    legal or privacy request channel. Hanami is operated from Türkiye and does not publish a separate postal office. Formal
                    correspondence can be initiated through the legal address, and a postal route will be provided where legally required.
                </p>
            </LegalSection>
        </LegalDocument>
    );
}

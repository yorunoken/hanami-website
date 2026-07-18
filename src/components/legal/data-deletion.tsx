import { Link } from "react-router-dom";

import { legalContacts } from "@/data/legal";
import { LegalDocument, LegalSection, LegalTable, type TocItem } from "./legal-document";

const toc: readonly TocItem[] = [
    { id: "differences", label: "Account controls" },
    { id: "immediate", label: "Immediate deletion" },
    { id: "other", label: "Other privacy requests" },
    { id: "limits", label: "Scope and limits" },
];

export default function DataDeletion() {
    return (
        <LegalDocument
            title="Data deletion and account controls"
            summary="What Hanami deletes immediately from the signed-in account, what remains separate, and how to request help with other data."
            toc={toc}
        >
            <LegalSection id="differences" title="1. Account controls">
                <LegalTable>
                    <thead>
                        <tr>
                            <th>Action</th>
                            <th>Effect</th>
                            <th>Important limit</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Sign out</td>
                            <td>Ends the current Hanami website session.</td>
                            <td>Does not remove account or product data.</td>
                        </tr>
                        <tr>
                            <td>Unlink a provider</td>
                            <td>Removes that login method from the canonical Hanami account.</td>
                            <td>The final usable login method cannot be removed.</td>
                        </tr>
                        <tr>
                            <td>Delete Hanami account</td>
                            <td>Immediately removes the canonical account, linked identities, sessions, and Companion credentials.</td>
                            <td>Does not delete provider accounts, a separate osu!guessr profile, or operational logs.</td>
                        </tr>
                    </tbody>
                </LegalTable>
            </LegalSection>

            <LegalSection id="immediate" title="2. Immediate signed-in deletion">
                <ol>
                    <li>
                        Open <Link to="/profile/privacy">account privacy</Link> and review the signed-in identity.
                    </li>
                    <li>Choose delete account. Hanami requires a provider sign-in from approximately the last 15 minutes.</li>
                    <li>
                        Type <code>DELETE MY HANAMI ACCOUNT</code> on the final confirmation screen.
                    </li>
                    <li>After confirmation, deletion runs immediately and signs the account out.</li>
                </ol>
                <p>The immediate action deletes:</p>
                <ul>
                    <li>the Better Auth website user, all linked provider identities and accounts, and all website sessions;</li>
                    <li>Companion devices and token families linked through database cascades;</li>
                    <li>the Hanami Bot user row when the account has a Discord identity; and</li>
                    <li>short-lived deletion reauthentication records and any legacy deletion-request record tied to the website user.</li>
                </ul>
                <p>
                    Bot cleanup is recorded before the canonical account is deleted. If the Bot database is unavailable, that cleanup
                    remains queued for an idempotent retry rather than rolling back or misrepresenting the canonical deletion.
                </p>
            </LegalSection>

            <LegalSection id="other" title="3. Other privacy requests">
                <p>
                    Email <a href={`mailto:${legalContacts.privacy}`}>{legalContacts.privacy}</a> if you cannot sign in, lost Discord
                    access, used osu!guessr separately, believe Hanami holds data outside the immediate deletion scope, or want access,
                    correction, restriction, portability, or objection rather than deletion.
                </p>
                <p>
                    Include the relevant Discord or osu! ID and which Hanami service you used. Do not send passwords, OAuth tokens, cookies,
                    API keys, backup codes, or government identity documents. Additional proportionate verification may be required. The
                    operator will explain any additional information needed and normally respond within 30 days.
                </p>
                <p>
                    Email is the practical contact path, but formal applications under Türkiye’s KVKK must follow the legally prescribed
                    method and content requirements. Hanami will provide an appropriate route when a request needs to be treated as a formal
                    KVKK application.
                </p>
            </LegalSection>

            <LegalSection id="limits" title="4. Scope and limits">
                <p>
                    Hanami cannot delete Discord or osu! provider accounts or provider-side records. The immediate website action also does
                    not authenticate against or delete a separate osu!guessr profile. Those records must be handled through the relevant
                    service or privacy contact.
                </p>
                <p>
                    Operational logs, private error-channel messages, abuse-prevention records, and analytics limitations may require
                    separate review or temporary retention for justified security or legal reasons. The repositories do not document a
                    production backup-retention schedule. A future provider sign-in may create a new Hanami account after deletion.
                </p>
            </LegalSection>
        </LegalDocument>
    );
}

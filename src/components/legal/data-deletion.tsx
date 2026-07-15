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
                            <td>Disconnect osu!</td>
                            <td>Clears the Discord-to-osu! ID link used by Hanami Bot.</td>
                            <td>Does not delete other account data or either provider account.</td>
                        </tr>
                        <tr>
                            <td>Delete Hanami account</td>
                            <td>Immediately removes the website identity and Discord-keyed Bot account data described below.</td>
                            <td>Does not delete provider accounts, a separate osu!guessr profile, logs, or backups.</td>
                        </tr>
                    </tbody>
                </LegalTable>
            </LegalSection>

            <LegalSection id="immediate" title="2. Immediate signed-in deletion">
                <ol>
                    <li>
                        Open <Link to="/profile/privacy">account privacy</Link> and review the signed-in identity.
                    </li>
                    <li>Choose delete account. Hanami requires a Discord sign-in from approximately the last 15 minutes.</li>
                    <li>
                        Type <code>DELETE MY HANAMI ACCOUNT</code> on the final confirmation screen.
                    </li>
                    <li>After confirmation, deletion runs immediately and signs the account out.</li>
                </ol>
                <p>The immediate action deletes:</p>
                <ul>
                    <li>the Better Auth website user, Discord provider link, and all website sessions;</li>
                    <li>the Hanami Bot user row keyed to that Discord account, including its linked osu! ID and saved preferences; and</li>
                    <li>short-lived deletion reauthentication records and any legacy deletion-request record tied to the website user.</li>
                </ul>
                <p>
                    If Hanami cannot reach the linked Bot database, the website account is kept and the action reports a temporary failure
                    instead of claiming that deletion completed.
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
            </LegalSection>

            <LegalSection id="limits" title="4. Scope and limits">
                <p>
                    Hanami cannot delete Discord or osu! provider accounts or provider-side records. The immediate website action also does
                    not authenticate against or delete a separate osu!guessr profile. Those records must be handled through the relevant
                    service or privacy contact.
                </p>
                <p>
                    Operational logs, private error-channel messages, abuse-prevention records, analytics limitations, and backup copies may
                    require separate review or temporary retention for justified security, legal, or recovery reasons. Future Discord
                    sign-in may create a new Hanami website account after deletion.
                </p>
            </LegalSection>
        </LegalDocument>
    );
}

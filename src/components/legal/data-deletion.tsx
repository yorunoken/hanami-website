import { Link } from "react-router-dom";

import { legalContacts } from "@/data/legal";
import {
  LegalDocument,
  LegalSection,
  LegalTable,
  OwnerConfirmation,
  type TocItem,
} from "./legal-document";

const toc: readonly TocItem[] = [
  { id: "differences", label: "What each action does" },
  { id: "signed-in", label: "Signed-in requests" },
  { id: "email", label: "Email fallback" },
  { id: "status", label: "Status and cancellation" },
  { id: "provider", label: "Discord and osu! data" },
  { id: "limits", label: "Current operational limits" },
];

export default function DataDeletion() {
  return (
    <LegalDocument
      title="Data deletion and account controls"
      summary="How to submit and track a Hanami deletion request, and how that differs from sign-out, unlinking, and provider deletion."
      toc={toc}
    >
      <LegalSection id="differences" title="1. What each action does">
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
              <td>Ends a Hanami website session.</td>
              <td>Does not remove account or product data.</td>
            </tr>
            <tr>
              <td>Disconnect osu!</td>
              <td>Clears the Discord-to-osu! ID link used by Hanami Bot.</td>
              <td>
                Does not delete Hanami records or either provider account.
              </td>
            </tr>
            <tr>
              <td>Request Hanami account deletion</td>
              <td>
                Records a verified request for coordinated review across
                relevant Hanami services.
              </td>
              <td>
                Processing is manual and does not erase every record
                immediately.
              </td>
            </tr>
            <tr>
              <td>Delete a Discord or osu! account</td>
              <td>Must be done through the relevant provider.</td>
              <td>
                Provider deletion does not automatically remove copies or
                associations previously stored by Hanami.
              </td>
            </tr>
          </tbody>
        </LegalTable>
      </LegalSection>

      <LegalSection id="signed-in" title="2. Signed-in requests">
        <ol>
          <li>
            Open <Link to="/profile/privacy">account privacy and deletion</Link>
            .
          </li>
          <li>
            Review the Discord identity and linked osu! identity shown in the
            account area.
          </li>
          <li>
            Start a deletion request. Hanami requires Discord authentication
            from approximately the last 15 minutes and sends you through Discord
            OAuth again when the current session is older.
          </li>
          <li>
            Type <code>DELETE MY HANAMI ACCOUNT</code> on the final confirmation
            screen. A single-click request is not accepted.
          </li>
          <li>
            Keep the random request reference. Submission revokes current Hanami
            website sessions; it does not delete the Better Auth identity or any
            cross-service data at that moment.
          </li>
        </ol>
        <p>
          The request is then reviewed across relevant website records, Hanami
          Bot settings, osu!guessr data, temporary Redis state, reports, logs,
          Discord error-channel messages where practical, analytics or
          advertising data limitations, and backups. A record may be deleted,
          anonymized, or temporarily retained where a justified security,
          abuse-prevention, legal, or backup reason applies.
        </p>
      </LegalSection>

      <LegalSection
        id="email"
        title="3. Email fallback and other privacy requests"
      >
        <p>
          Email{" "}
          <a href={`mailto:${legalContacts.privacy}`}>
            {legalContacts.privacy}
          </a>{" "}
          if you cannot sign in, lost access to Discord, only used Hanami Bot
          without a web account, believe Hanami holds data not visible in your
          account, or want access, correction, restriction, portability, or
          objection rather than deletion.
        </p>
        <p>You may provide:</p>
        <ul>
          <li>your Discord user ID and the linked Discord account;</li>
          <li>your osu! ID or username, if relevant;</li>
          <li>which Hanami services you used; and</li>
          <li>the type and scope of request.</li>
        </ul>
        <p>
          Do not send passwords, OAuth access or refresh tokens, cookies,
          session tokens, API keys, backup codes, or government identity
          documents. Public usernames and numeric provider IDs alone are not
          sufficient identity verification. Additional proportionate
          verification may be required. The lost-account verification process
          and final response period are <OwnerConfirmation />.
        </p>
      </LegalSection>

      <LegalSection id="status" title="4. Request status and cancellation">
        <p>
          Signed-in users can view the reference, submission date, current
          status, last update, and any user-facing next step in the account
          privacy area. Internal operator notes and raw processing failures are
          not shown.
        </p>
        <p>
          A request can be cancelled online while it is <em>pending</em> or{" "}
          <em>in review</em>. It cannot be cancelled after processing begins or
          after it reaches a terminal state. Email{" "}
          <a href={`mailto:${legalContacts.privacy}`}>
            {legalContacts.privacy}
          </a>{" "}
          with the request reference if you need help.
        </p>
      </LegalSection>

      <LegalSection id="provider" title="5. Data held by Discord and osu!">
        <p>
          Hanami cannot delete Discord or osu! accounts, provider-side
          authentication logs, or other records those providers independently
          control. Use their account and privacy controls for provider-side
          data. A Hanami request covers copies and associations controlled by
          Hanami, subject to verified identity and applicable retention
          requirements.
        </p>
      </LegalSection>

      <LegalSection id="limits" title="6. Current operational limits">
        <p>
          <strong>
            Full automatic cross-service deletion is not implemented.
          </strong>{" "}
          The in-app workflow securely records and tracks a request; an operator
          coordinates the actual work manually. Better Auth user and account
          rows are not deleted when a request is submitted, and the incomplete
          osu!guessr user-delete action is not treated as ecosystem-wide
          deletion.
        </p>
        <p>
          Retention of completed request records, backup expiry, records that
          must be anonymized rather than removed, the response deadline, and the
          behavior of future sign-ins after completed deletion are{" "}
          <OwnerConfirmation />.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}

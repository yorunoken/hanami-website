import {
  LegalDocument,
  LegalSection,
  LegalTable,
  OwnerConfirmation,
  type TocItem,
} from "./legal-document";
import { legalContacts } from "@/data/legal";

const toc: readonly TocItem[] = [
  { id: "meaning", label: "What this notice covers" },
  { id: "web", label: "Hanami website cookies" },
  { id: "guessr", label: "osu!guessr cookies" },
  { id: "storage", label: "Other browser storage" },
  { id: "third-party", label: "Third-party scripts and content" },
  { id: "choices", label: "Choices and consent" },
  { id: "contact", label: "Questions" },
];

export default function CookiePolicy() {
  return (
    <LegalDocument
      title="Cookie and browser-storage policy"
      summary="A code-based inventory of authentication cookies, local storage, session storage, and third-party scripts across the Hanami website and osu!guessr."
      toc={toc}
    >
      <LegalSection id="meaning" title="1. What this notice covers">
        <p>
          Cookies are small values a site asks a browser to retain. This notice
          also covers local storage and session storage. Names below reflect the
          audited library defaults; local development omits secure prefixes, and
          large values can be split into numbered cookie chunks.
        </p>
      </LegalSection>

      <LegalSection id="web" title="2. Hanami website cookies">
        <LegalTable>
          <thead>
            <tr>
              <th>Name</th>
              <th>Provider and purpose</th>
              <th>Lifetime</th>
              <th>Status and attributes</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>__Secure-better-auth.session_token</code>
              </td>
              <td>
                First-party Better Auth cookie used to identify the signed-in
                web session.
              </td>
              <td>
                Approximately 7 days by default; a session-only form can be used
                when “remember me” is disabled.
              </td>
              <td>
                Strictly necessary. HTTP-only, Secure in HTTPS production,
                SameSite=Lax, Path=/.
              </td>
            </tr>
            <tr>
              <td>
                <code>__Secure-better-auth.dont_remember</code>
              </td>
              <td>
                First-party Better Auth flag used only when a non-persistent
                session is requested.
              </td>
              <td>Browser session.</td>
              <td>
                Strictly necessary when used. HTTP-only, Secure in HTTPS
                production, SameSite=Lax, Path=/.
              </td>
            </tr>
          </tbody>
        </LegalTable>
        <p>
          The current configuration does not enable Better Auth’s optional
          session-data cookie cache or account-data cookie. With a
          database-backed configuration, OAuth state is stored in the
          verification table rather than an OAuth-state cookie.
        </p>
        <p>
          A deletion request may require a new Discord OAuth round trip. It uses
          Better Auth’s existing necessary OAuth/session mechanisms plus a
          short-lived server-side challenge whose random browser value is
          removed from the address after the confirmation page reads it. The
          workflow does not add an analytics, advertising, or consent cookie.
        </p>
      </LegalSection>

      <LegalSection id="guessr" title="3. osu!guessr cookies">
        <LegalTable>
          <thead>
            <tr>
              <th>Name</th>
              <th>Provider and purpose</th>
              <th>Lifetime</th>
              <th>Status and attributes</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>__Secure-authjs.session-token</code>
              </td>
              <td>First-party Auth.js encrypted session for osu! sign-in.</td>
              <td>Approximately 30 days by library default.</td>
              <td>
                Strictly necessary. HTTP-only, Secure on HTTPS, SameSite=Lax,
                Path=/.
              </td>
            </tr>
            <tr>
              <td>
                <code>__Host-authjs.csrf-token</code>
              </td>
              <td>
                First-party Auth.js cross-site-request-forgery protection.
              </td>
              <td>Browser session unless refreshed or cleared sooner.</td>
              <td>
                Strictly necessary. HTTP-only, Secure on HTTPS, SameSite=Lax,
                Path=/.
              </td>
            </tr>
            <tr>
              <td>
                <code>__Secure-authjs.callback-url</code>
              </td>
              <td>First-party Auth.js return location used during sign-in.</td>
              <td>Browser session.</td>
              <td>
                Strictly necessary when set. HTTP-only, Secure on HTTPS,
                SameSite=Lax, Path=/.
              </td>
            </tr>
            <tr>
              <td>
                <code>__Secure-authjs.pkce.code_verifier</code>
              </td>
              <td>
                First-party Auth.js proof-key value for the OAuth exchange.
              </td>
              <td>About 15 minutes.</td>
              <td>
                Strictly necessary. HTTP-only, Secure on HTTPS, SameSite=Lax,
                Path=/.
              </td>
            </tr>
            <tr>
              <td>
                <code>__Secure-authjs.state</code>
              </td>
              <td>
                First-party Auth.js state value used to prevent OAuth request
                forgery.
              </td>
              <td>About 15 minutes.</td>
              <td>
                Strictly necessary. HTTP-only, Secure on HTTPS, SameSite=Lax,
                Path=/.
              </td>
            </tr>
            <tr>
              <td>
                <code>__Secure-authjs.nonce</code>
              </td>
              <td>
                First-party Auth.js replay-protection value when required by the
                provider flow.
              </td>
              <td>Browser session.</td>
              <td>
                Strictly necessary when set. HTTP-only, Secure on HTTPS,
                SameSite=Lax, Path=/.
              </td>
            </tr>
            <tr>
              <td>
                <code>locale</code>
              </td>
              <td>First-party language preference written by osu!guessr.</td>
              <td>About 1 year.</td>
              <td>
                Functional. SameSite=Lax, Path=/; JavaScript-readable. Secure is
                not set explicitly in the audited code.
              </td>
            </tr>
          </tbody>
        </LegalTable>
      </LegalSection>

      <LegalSection id="storage" title="4. Other browser storage">
        <LegalTable>
          <thead>
            <tr>
              <th>Key</th>
              <th>Storage</th>
              <th>Purpose</th>
              <th>Duration</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>app-config</code>
              </td>
              <td>osu!guessr local storage</td>
              <td>Game, UI, API, audio, and performance preferences.</td>
              <td>Until cleared or overwritten.</td>
            </tr>
            <tr>
              <td>
                <code>locale</code>
              </td>
              <td>osu!guessr local storage</td>
              <td>Language preference synchronized to the locale cookie.</td>
              <td>Until cleared or overwritten.</td>
            </tr>
            <tr>
              <td>
                <code>theme</code>
              </td>
              <td>osu!guessr local storage</td>
              <td>Theme preference supplied by next-themes.</td>
              <td>Until cleared or overwritten.</td>
            </tr>
            <tr>
              <td>
                <code>osu-guessr:game-session:…</code>
              </td>
              <td>osu!guessr session storage</td>
              <td>
                Opaque identifier used to recover the current game session.
              </td>
              <td>
                Normally the browser-tab session; cleared when the game ends.
              </td>
            </tr>
            <tr>
              <td>
                <code>osu-guessr:action-reload-attempted</code>
              </td>
              <td>osu!guessr session storage</td>
              <td>
                Prevents repeated reloads after a deployment/action mismatch.
              </td>
              <td>Browser-tab session.</td>
            </tr>
          </tbody>
        </LegalTable>
        <p>
          No application use of IndexedDB was found in the audited Hanami web or
          osu!guessr source. No local or session storage was found in the main
          Hanami website source.
        </p>
      </LegalSection>

      <LegalSection id="third-party" title="5. Third-party scripts and content">
        <p>
          Account views can request Discord or osu! avatar images. These
          requests disclose ordinary network metadata to the relevant host but
          do not require a Hanami consent cookie. The main website uses system
          fonts and does not request an external font stylesheet.
        </p>
        <p>
          osu!guessr loads Umami from <code>umami.yorunoken.com</code> and
          Google AdSense in production. Whether the deployed Umami instance is
          cookieless, which AdSense cookies or local-storage values are set,
          regional consent mode, personalized-ad settings, script blocking
          before consent, and provider retention are <OwnerConfirmation />. A
          live production storage audit is required before the policy becomes
          effective.
        </p>
        <p>
          No tracking pixel or third-party iframe was found in the audited
          source. Google AdSense can make additional network requests and inject
          ad content at runtime.
        </p>
      </LegalSection>

      <LegalSection id="choices" title="6. Choices and consent">
        <p>
          The main Hanami website uses code-defined authentication and security
          cookies only, so this draft does not add a decorative consent banner.
          Users can decline them by not signing in, or clear them by signing out
          and using browser controls; authentication will not work without the
          session cookie.
        </p>
        <p>
          osu!guessr’s production analytics and advertising scripts are
          non-essential. Whether they require prior consent, an opt-out, or a
          consent-management platform depends on deployment settings and
          applicable law. That decision and any implementation are{" "}
          <OwnerConfirmation /> and require legal review. Browser blocking can
          affect ads, analytics, sign-in, and game recovery.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="7. Questions about cookies and storage">
        <p>
          Contact{" "}
          <a href={`mailto:${legalContacts.privacy}`}>
            {legalContacts.privacy}
          </a>{" "}
          with questions about cookies, browser storage, or related privacy
          controls.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}

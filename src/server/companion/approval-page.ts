import type { CompanionAuthorizationInput } from "./protocol";

export function renderCompanionApprovalPage(input: {
    authorization: CompanionAuthorizationInput;
    requestId: string;
    csrfToken: string;
}): string {
    const deviceName = escapeHtml(input.authorization.deviceName);
    const platform = escapeHtml(input.authorization.platform);
    const requestId = escapeHtml(input.requestId);
    const csrfToken = escapeHtml(input.csrfToken);

    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Connect Hanami Companion</title>
  <style>
    :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, sans-serif; background: #0d0b0f; color: #f7f1f5; }
    body { min-height: 100vh; display: grid; place-items: center; margin: 0; padding: 24px; box-sizing: border-box; }
    main { width: min(100%, 480px); border: 1px solid #332a34; padding: 36px; background: #151117; }
    p { color: #c9bdc7; line-height: 1.65; }
    dl { display: grid; grid-template-columns: auto 1fr; gap: 8px 20px; margin: 28px 0; }
    dt { color: #92838f; } dd { margin: 0; overflow-wrap: anywhere; }
    form { display: flex; gap: 12px; flex-wrap: wrap; }
    button { min-width: 132px; border: 1px solid #514351; padding: 12px 18px; color: inherit; background: transparent; cursor: pointer; }
    button[value="approve"] { border-color: #eb76aa; background: #eb76aa; color: #190d13; font-weight: 700; }
    button:focus-visible { outline: 2px solid white; outline-offset: 3px; }
  </style>
</head>
<body>
  <main>
    <h1>Connect Hanami Companion?</h1>
    <p>Hanami Companion wants permission to connect to your Hanami account on this device. Approval creates a revocable device session.</p>
    <dl><dt>Device</dt><dd>${deviceName}</dd><dt>Platform</dt><dd>${platform}</dd></dl>
    <form method="post" action="/oauth/authorize">
      <input type="hidden" name="request_id" value="${requestId}">
      <input type="hidden" name="csrf_token" value="${csrfToken}">
      <button type="submit" name="decision" value="approve">Approve</button>
      <button type="submit" name="decision" value="cancel">Cancel</button>
    </form>
  </main>
</body>
</html>`;
}

function escapeHtml(value: string): string {
    return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

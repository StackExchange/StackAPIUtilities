export function CredentialsPanel() {
  return (
    <section className="workspace-panel" aria-labelledby="credentials-heading">
      <div className="workspace-header">
        <p className="fs-caption fc-light mb4">Browser session</p>
        <h2 className="fs-headline2 m0" id="credentials-heading">
          Session Credentials
        </h2>
      </div>
      <p className="fs-body2 workspace-copy">
        Credentials are kept in memory for this browser session only.
      </p>
      <div className="placeholder-notice" role="note">
        Credential acquisition guidance placeholder: add internal instructions for API keys, PATs,
        access tokens, and required scopes here.
      </div>
    </section>
  );
}

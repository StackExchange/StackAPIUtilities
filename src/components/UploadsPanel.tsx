export function UploadsPanel() {
  return (
    <section className="workspace-panel" aria-labelledby="uploads-heading">
      <div className="workspace-header">
        <p className="fs-caption fc-light mb4">Local files</p>
        <h2 className="fs-headline2 m0" id="uploads-heading">
          Uploads
        </h2>
      </div>
      <p className="fs-body2 workspace-copy">
        Upload existing CSV or JSON outputs from current SO4T scripts. Files are parsed locally in
        this browser session only.
      </p>
      <label className="d-block upload-input-label">
        <span className="d-block fs-caption tt-uppercase fc-light mb4">Report files</span>
        <input className="s-input" type="file" multiple accept=".csv,.json" />
      </label>
    </section>
  );
}

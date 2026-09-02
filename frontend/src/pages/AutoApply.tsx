import { useEffect, useMemo, useState } from "react";

type Application = {
  id?: number;
  url: string;
  company?: string;
  title?: string;
  adapter?: string;
  status: string;
  reason?: string;
  created_at?: string;
};

const API = import.meta.env.VITE_AUTO_APPLY_API || "http://127.0.0.1:8000";

export default function AutoApply() {
  const [urls, setUrls] = useState("");
  const [dryRun, setDryRun] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [applications, setApplications] = useState<Application[]>([]);
  const [config, setConfig] = useState<{ valid?: boolean; missing?: string[] }>({});

  const refresh = async () => {
    try {
      const [apps, check] = await Promise.all([
        fetch(`${API}/api/applications`).then((r) => r.json()),
        fetch(`${API}/api/config/check`).then((r) => r.json()),
      ]);
      setApplications(apps);
      setConfig(check);
    } catch {
      setMessage("Backend is not running. Start auto_apply/app.py on port 8000.");
    }
  };

  useEffect(() => { refresh(); }, []);

  const counts = useMemo(() => ({
    applied: applications.filter((a) => a.status === "applied").length,
    review: applications.filter((a) => a.status === "needs_human").length,
    preview: applications.filter((a) => a.status === "preview").length,
    failed: applications.filter((a) => a.status === "failed").length,
  }), [applications]);

  const run = async () => {
    const list = urls.split(/\n|,/).map((x) => x.trim()).filter(Boolean);
    if (!list.length) return setMessage("Paste at least one job URL.");
    setLoading(true); setMessage("");
    try {
      const response = await fetch(`${API}/api/jobs/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: list, auto_submit: !dryRun }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Run failed");
      const applied = data.results?.filter((r: Application) => r.status === "applied").length || 0;
      const review = data.results?.filter((r: Application) => r.status === "needs_human").length || 0;
      setMessage(`Run complete: ${applied} submitted, ${review} need review.`);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Run failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="page auto-apply-page">
      <div className="page-header">
        <div className="auto-title-row">
          <div>
            <p className="eyebrow">ROBOAPPLY ENGINE</p>
            <h1>Job Applications</h1>
            <p className="page-description">Paste compatible career-page URLs, fill the application from your profile, and keep a complete application log.</p>
          </div>
          <span className={`engine-pill ${config.valid ? "ready" : "warning"}`}>{config.valid ? "● Engine ready" : "● Profile setup needed"}</span>
        </div>
      </div>

      <section className="auto-grid">
        <div className="panel apply-run-card">
          <div className="panel-header"><h3>Start a run</h3><p>Greenhouse and Lever are the primary automated flows. Workday and unknown ATS pages use safe best-effort filling and can stop for you.</p></div>
          <label className="field-label">Job URLs</label>
          <textarea value={urls} onChange={(e) => setUrls(e.target.value)} placeholder={'https://boards.greenhouse.io/company/jobs/...\nhttps://jobs.lever.co/company/...'} />
          <div className="run-options">
            <label className="toggle-row"><input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} /><span>Dry run / review first</span></label>
            <button className="primary-btn dark-btn" disabled={loading || !config.valid} onClick={run}>{loading ? "Running…" : dryRun ? "Preview applications →" : "Run applications →"}</button>
          </div>
          {!config.valid && <p className="warning-text">Missing profile fields: {(config.missing || []).join(", ") || "profile.json"}</p>}
          {message && <div className="run-message">{message}</div>}
        </div>

        <div className="panel">
          <div className="panel-header"><h3>Application pulse</h3><p>Local SQLite tracking</p></div>
          <div className="pulse-grid">
            <div><strong>{counts.applied}</strong><span>Submitted</span></div>
            <div><strong>{counts.review}</strong><span>Needs review</span></div>
            <div><strong>{counts.preview}</strong><span>Previewed</span></div>
            <div><strong>{counts.failed}</strong><span>Failed</span></div>
          </div>
          <div className="safe-note"><strong>Human checkpoints</strong><span>CAPTCHA, MFA, unknown required questions, and unreliable submit controls are handed back to you instead of being bypassed.</span></div>
        </div>
      </section>

      <section className="panel application-panel">
        <div className="panel-header application-header"><div><h3>Application history</h3><p>Every run is deduplicated by job URL.</p></div><button className="refresh-btn" onClick={refresh}>↻ Refresh</button></div>
        {applications.length === 0 ? <div className="empty-state"><span>📋</span><strong>No applications yet</strong><p>Start with a Greenhouse or Lever job URL in dry-run mode.</p></div> : (
          <div className="application-list">{applications.map((item) => (
            <div className="application-row" key={`${item.id}-${item.url}`}>
              <div className="application-main"><strong>{item.title || "Job application"}</strong><span>{item.company || item.adapter || "Career page"}</span><small>{item.url}</small></div>
              <div className="application-status"><span className={`status-badge ${item.status}`}>{item.status.replace("_", " ")}</span><small>{item.reason || ""}</small></div>
            </div>
          ))}</div>
        )}
      </section>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import "./AutoApply.css";

type Job = { title: string; company: string; location?: string; url: string; source?: string; score?: number; description?: string };
type Application = { id?: number; url: string; company?: string; title?: string; adapter?: string; status: string; reason?: string; created_at?: string };
const API = import.meta.env.VITE_AUTO_APPLY_API || "http://127.0.0.1:8000";

export default function AutoApply() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [urls, setUrls] = useState("");
  const [greenhouse, setGreenhouse] = useState("");
  const [lever, setLever] = useState("");
  const [ashby, setAshby] = useState("");
  const [minimumScore, setMinimumScore] = useState(60);
  const [dryRun, setDryRun] = useState(true);
  const [loading, setLoading] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [message, setMessage] = useState("");
  const [config, setConfig] = useState<{ valid?: boolean; missing?: string[] }>({});
  const [tab, setTab] = useState<"jobs" | "history">("jobs");
  const [selected, setSelected] = useState<string[]>([]);

  const refresh = async () => {
    try {
      const [apps, check] = await Promise.all([
        fetch(`${API}/api/applications`).then(r => r.json()),
        fetch(`${API}/api/config/check`).then(r => r.json()),
      ]);
      setApplications(apps); setConfig(check);
    } catch { setMessage("Start the Auto Apply engine on port 8000 to connect."); }
  };
  useEffect(() => { refresh(); }, []);

  const counts = useMemo(() => ({
    applied: applications.filter(a => a.status === "applied").length,
    review: applications.filter(a => a.status === "needs_human").length,
    preview: applications.filter(a => a.status === "preview").length,
  }), [applications]);

  const discoverJobs = async () => {
    setDiscovering(true); setMessage("");
    try {
      const body = {
        greenhouse: greenhouse.split(/\n|,/).map(x => x.trim()).filter(Boolean),
        lever: lever.split(/\n|,/).map(x => x.trim()).filter(Boolean),
        ashby: ashby.split(/\n|,/).map(x => x.trim()).filter(Boolean),
        minimum_score: minimumScore, max_results: 50,
      };
      const r = await fetch(`${API}/api/jobs/discover`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await r.json(); if (!r.ok) throw new Error(data.detail || "Discovery failed");
      setJobs(data.jobs || []); setSelected([]); setTab("jobs"); setMessage(`Found ${data.count || 0} matching jobs.`);
    } catch (e) { setMessage(e instanceof Error ? e.message : "Discovery failed"); }
    finally { setDiscovering(false); }
  };

  const run = async (runUrls: string[]) => {
    if (!runUrls.length) { setMessage("Select a job or paste a career-page URL first."); return; }
    setLoading(true); setMessage("");
    try {
      const r = await fetch(`${API}/api/jobs/run`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ urls: runUrls, auto_submit: !dryRun }) });
      const data = await r.json(); if (!r.ok) throw new Error(data.detail || "Application run failed");
      const applied = (data.results || []).filter((x: Application) => x.status === "applied").length;
      const review = (data.results || []).filter((x: Application) => x.status === "needs_human").length;
      setMessage(dryRun ? `Preview ready for ${data.results?.length || 0} jobs.` : `${applied} submitted · ${review} need your review.`);
      setSelected([]); await refresh(); setTab("history");
    } catch (e) { setMessage(e instanceof Error ? e.message : "Application run failed"); }
    finally { setLoading(false); }
  };

  const toggle = (url: string) => setSelected(s => s.includes(url) ? s.filter(x => x !== url) : [...s, url]);
  const statusLabel = (s: string) => s.replace("_", " ");

  return <div className="page auto-apply-page">
    <section className="robo-hero">
      <div><div className="eyebrow">ROBOAPPLY</div><h1>Apply to jobs without the busywork.</h1><p>Find strong matches, review them, and let the application engine handle compatible career pages.</p></div>
      <div className={`engine-pill ${config.valid ? "ready" : "warning"}`}>{config.valid ? "● Ready to apply" : "● Complete profile"}</div>
    </section>

    <section className="robo-stats">
      <div><span>Applications</span><strong>{applications.length}</strong></div><div><span>Submitted</span><strong>{counts.applied}</strong></div><div><span>Needs review</span><strong>{counts.review}</strong></div><div><span>Previewed</span><strong>{counts.preview}</strong></div>
    </section>

    <div className="robo-tabs"><button className={tab === "jobs" ? "active" : ""} onClick={() => setTab("jobs")}>Find jobs</button><button className={tab === "history" ? "active" : ""} onClick={() => setTab("history")}>Application tracker</button></div>

    {tab === "jobs" ? <>
      <section className="discover-card">
        <div className="section-heading"><div><h2>Find your next role</h2><p>Search configured Greenhouse, Lever, and Ashby boards using your profile match.</p></div><span className="match-chip">AI match</span></div>
        <div className="discover-fields"><input value={greenhouse} onChange={e => setGreenhouse(e.target.value)} placeholder="Greenhouse boards / slugs" /><input value={lever} onChange={e => setLever(e.target.value)} placeholder="Lever sites / slugs" /><input value={ashby} onChange={e => setAshby(e.target.value)} placeholder="Ashby boards / slugs" /><label>Minimum match <b>{minimumScore}%</b><input type="range" min="0" max="100" value={minimumScore} onChange={e => setMinimumScore(+e.target.value)} /></label></div>
        <button className="primary-btn" onClick={discoverJobs} disabled={discovering || !config.valid}>{discovering ? "Finding matches…" : "Find matching jobs →"}</button>
        {!config.valid && <small className="warning-text">Add {config.missing?.join(", ") || "your profile"} before running applications.</small>}
      </section>

      <section className="paste-card"><div><strong>Have a job URL already?</strong><span>Paste compatible career-page URLs below.</span></div><textarea value={urls} onChange={e => setUrls(e.target.value)} placeholder="Paste Greenhouse / Lever / compatible ATS URLs…" /><button className="secondary-btn" disabled={loading || !config.valid} onClick={() => run(urls.split(/\n|,/).map(x => x.trim()).filter(Boolean))}>{loading ? "Running…" : dryRun ? "Preview applications" : "Apply now"}</button></section>

      {jobs.length > 0 && <section className="jobs-section"><div className="section-heading"><div><h2>Recommended jobs</h2><p>{selected.length ? `${selected.length} selected` : "Select the roles you want to process."}</p></div><button className="primary-btn compact" disabled={!selected.length || loading || !config.valid} onClick={() => run(selected)}>{dryRun ? "Preview selected" : "Apply to selected"} →</button></div><div className="job-grid">{jobs.map(job => <article className={`job-card ${selected.includes(job.url) ? "selected" : ""}`} key={job.url} onClick={() => toggle(job.url)}><div className="job-top"><span className="source-badge">{job.source || "ATS"}</span><span className="score">{Math.round(job.score || 0)}% match</span></div><h3>{job.title}</h3><p className="company">{job.company}</p><p className="location">⌖ {job.location || "Remote / flexible"}</p><div className="job-bottom"><span>{selected.includes(job.url) ? "✓ Selected" : "Select role"}</span><a href={job.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>View job ↗</a></div></article>)}</div></section>}
    </> : <section className="tracker-card"><div className="section-heading"><div><h2>Application tracker</h2><p>Every run is deduplicated and logged locally.</p></div><button className="secondary-btn" onClick={refresh}>Refresh</button></div>{applications.length === 0 ? <div className="empty-state"><strong>No applications yet</strong><span>Start with job discovery or paste a compatible career-page URL.</span></div> : <div className="application-list">{applications.map(a => <div className="application-row" key={`${a.id}-${a.url}`}><div><h3>{a.title || "Job application"}</h3><span>{a.company || a.adapter || "Career page"}</span><small>{a.url}</small></div><div className="application-status"><b className={`status-badge ${a.status}`}>{statusLabel(a.status)}</b><small>{a.reason || ""}</small></div></div>)}</div>}</section>}

    <footer className="robo-footer"><label><input type="checkbox" checked={dryRun} onChange={e => setDryRun(e.target.checked)} /> <b>Review before submitting</b></label><span>CAPTCHA, MFA and unknown required questions always stop for human review.</span></footer>
    {message && <div className="run-message">{message}</div>}
  </div>;
}

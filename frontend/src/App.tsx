import { useState } from "react";
import "./index.css";
import ResumeAnalyzer from "./pages/ResumeAnalyzer";
import JobMatcher from "./pages/JobMatcher";
import CareerRoadmap from "./pages/CareerRoadmap";
import InterviewPrep from "./pages/InterviewPrep";
import AutoApply from "./pages/AutoApply";

function Sidebar({ page, setPage }: { page: string; setPage: (page: string) => void }) {
  return <aside className="sidebar"><div className="logo"><div className="logo-icon">AI</div><div><strong>Career</strong><span>Copilot</span></div></div><nav>
    <button className={`nav-item ${page === "dashboard" ? "active" : ""}`} onClick={() => setPage("dashboard")}><span>⌂</span>Dashboard</button>
    <button className={`nav-item ${page === "resume" ? "active" : ""}`} onClick={() => setPage("resume")}><span>📄</span>Resume Analyzer</button>
    <button className={`nav-item ${page === "job" ? "active" : ""}`} onClick={() => setPage("job")}><span>🎯</span>Job Matcher</button>
    <button className={`nav-item ${page === "roadmap" ? "active" : ""}`} onClick={() => setPage("roadmap")}><span>🗺️</span>Career Roadmap</button>
    <button className={`nav-item ${page === "interview" ? "active" : ""}`} onClick={() => setPage("interview")}><span>💬</span>Interview Prep</button>
    <button className={`nav-item ${page === "auto-apply" ? "active" : ""}`} onClick={() => setPage("auto-apply")}><span>🤖</span>Auto Apply</button>
  </nav><div className="sidebar-bottom"><button className="nav-item"><span>⚙️</span>Settings</button></div></aside>;
}

function App() {
  const [page, setPage] = useState("dashboard");
  const shell = (content: React.ReactNode) => <div className="app"><Sidebar page={page} setPage={setPage} /><main className="main">{content}</main></div>;
  if (page === "resume") return shell(<ResumeAnalyzer />);
  if (page === "job") return shell(<JobMatcher />);
  if (page === "roadmap") return shell(<CareerRoadmap />);
  if (page === "interview") return shell(<InterviewPrep />);
  if (page === "auto-apply") return shell(<AutoApply />);

  return shell(<><header className="topbar"><div><p className="welcome">Welcome back 👋</p><h1>Your Career Dashboard</h1></div><div className="profile"><div className="avatar">KA</div><div><strong>Khadar Ali</strong><span>CSE Student</span></div></div></header>
    <section className="hero"><div><span className="badge">AI Career Assistant</span><h2>Build your career<br /><span>with AI.</span></h2><p>Analyze your resume, discover matching jobs, identify skill gaps, prepare for interviews, and automate compatible applications.</p><div className="hero-buttons"><button className="primary-btn" onClick={() => setPage("resume")}>Analyze Resume →</button><button className="secondary-btn" onClick={() => setPage("auto-apply")}>Open Auto Apply →</button></div></div><div className="hero-card"><div className="score-circle"><strong>78</strong><span>/100</span></div><h3>Career Readiness</h3><p>You're making good progress. Keep improving your skills.</p></div></section>
    <section className="stats"><div className="stat-card"><div className="stat-icon">📄</div><div><span>Resume Score</span><strong>78%</strong></div></div><div className="stat-card"><div className="stat-icon">🎯</div><div><span>Job Matches</span><strong>24</strong></div></div><div className="stat-card"><div className="stat-icon">🧠</div><div><span>Skills Identified</span><strong>18</strong></div></div><div className="stat-card"><div className="stat-icon">🤖</div><div><span>Auto Apply</span><strong>Live</strong></div></div></section>
    <section className="content-grid"><div className="panel"><div className="panel-header"><h3>Quick Actions</h3><p>What would you like to do?</p></div><div className="actions"><button className="action-card" onClick={() => setPage("resume")}><span>📄</span><div><strong>Analyze Resume</strong><small>Get an AI-powered resume score</small></div><b>→</b></button><button className="action-card" onClick={() => setPage("job")}><span>🎯</span><div><strong>Match a Job</strong><small>Compare your skills with a job</small></div><b>→</b></button><button className="action-card" onClick={() => setPage("auto-apply")}><span>🤖</span><div><strong>Auto Apply</strong><small>Run compatible ATS applications</small></div><b>→</b></button><button className="action-card" onClick={() => setPage("interview")}><span>💬</span><div><strong>Practice Interview</strong><small>Prepare with your AI interviewer</small></div><b>→</b></button></div></div><div className="panel"><div className="panel-header"><h3>Skill Progress</h3><p>Your current technical skills</p></div>{[["Python","85%"],["React","70%"],["Machine Learning","75%"],["FastAPI","65%"]].map(([name, score]) => <div className="skill" key={name}><div><span>{name}</span><strong>{score}</strong></div><div className="progress"><div style={{ width: score }} /></div></div>)}</div></section></>);
}

export default App;

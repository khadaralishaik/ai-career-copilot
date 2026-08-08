import { useState } from "react";
import "./index.css";
import ResumeAnalyzer from "./pages/ResumeAnalyzer";
import JobMatcher from "./pages/JobMatcher";
import CareerRoadmap from "./pages/CareerRoadmap";
import InterviewPrep from "./pages/InterviewPrep";

function Sidebar({
  page,
  setPage,
}: {
  page: string;
  setPage: (page: string) => void;
}) {
  return (
    <aside className="sidebar">
      <div className="logo">
        <div className="logo-icon">AI</div>

        <div>
          <strong>Career</strong>
          <span>Copilot</span>
        </div>
      </div>

      <nav>
        <button
          className={`nav-item ${
            page === "dashboard" ? "active" : ""
          }`}
          onClick={() => setPage("dashboard")}
        >
          <span>⌂</span>
          Dashboard
        </button>

        <button
          className={`nav-item ${
            page === "resume" ? "active" : ""
          }`}
          onClick={() => setPage("resume")}
        >
          <span>📄</span>
          Resume Analyzer
        </button>

        <button
          className={`nav-item ${
            page === "job" ? "active" : ""
          }`}
          onClick={() => setPage("job")}
        >
          <span>🎯</span>
          Job Matcher
        </button>

        <button
          className={`nav-item ${
            page === "roadmap" ? "active" : ""
          }`}
          onClick={() => setPage("roadmap")}
        >
          <span>🗺️</span>
          Career Roadmap
        </button>

        <button
          className={`nav-item ${
            page === "interview" ? "active" : ""
          }`}
          onClick={() => setPage("interview")}
        >
          <span>💬</span>
          Interview Prep
        </button>

        <button className="nav-item">
          <span>📊</span>
          Applications
        </button>
      </nav>

      <div className="sidebar-bottom">
        <button className="nav-item">
          ⚙️ Settings
        </button>
      </div>
    </aside>
  );
}

function App() {
  const [page, setPage] = useState("dashboard");

  /* =========================
     RESUME ANALYZER
  ========================= */

  if (page === "resume") {
    return (
      <div className="app">
        <Sidebar page={page} setPage={setPage} />

        <main className="main">
          <ResumeAnalyzer />
        </main>
      </div>
    );
  }

  /* =========================
     JOB MATCHER
  ========================= */

  if (page === "job") {
    return (
      <div className="app">
        <Sidebar page={page} setPage={setPage} />

        <main className="main">
          <JobMatcher />
        </main>
      </div>
    );
  }

  /* =========================
     CAREER ROADMAP
  ========================= */

  if (page === "roadmap") {
    return (
      <div className="app">
        <Sidebar page={page} setPage={setPage} />

        <main className="main">
          <CareerRoadmap />
        </main>
      </div>
    );
  }

  /* =========================
     INTERVIEW PREP
  ========================= */

  if (page === "interview") {
    return (
      <div className="app">
        <Sidebar page={page} setPage={setPage} />

        <main className="main">
          <InterviewPrep />
        </main>
      </div>
    );
  }

  /* =========================
     DASHBOARD
  ========================= */

  return (
    <div className="app">
      <Sidebar page={page} setPage={setPage} />

      <main className="main">
        <header className="topbar">
          <div>
            <p className="welcome">
              Welcome back 👋
            </p>

            <h1>Your Career Dashboard</h1>
          </div>

          <div className="profile">
            <div className="avatar">
              KA
            </div>

            <div>
              <strong>Khadar Ali</strong>
              <span>CSE Student</span>
            </div>
          </div>
        </header>

        {/* HERO */}

        <section className="hero">
          <div>
            <span className="badge">
              AI Career Assistant
            </span>

            <h2>
              Build your career
              <br />
              <span>with AI.</span>
            </h2>

            <p>
              Analyze your resume, discover matching
              jobs, identify skill gaps, and prepare
              for interviews.
            </p>

            <div className="hero-buttons">
              <button
                className="primary-btn"
                onClick={() => setPage("resume")}
              >
                Analyze Resume →
              </button>

              <button
                className="secondary-btn"
                onClick={() => setPage("job")}
              >
                Match a Job →
              </button>
            </div>
          </div>

          <div className="hero-card">
            <div className="score-circle">
              <strong>78</strong>
              <span>/100</span>
            </div>

            <h3>Career Readiness</h3>

            <p>
              You're making good progress.
              Keep improving your skills.
            </p>
          </div>
        </section>

        {/* STATS */}

        <section className="stats">
          <div className="stat-card">
            <div className="stat-icon">
              📄
            </div>

            <div>
              <span>Resume Score</span>
              <strong>78%</strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              🎯
            </div>

            <div>
              <span>Job Matches</span>
              <strong>24</strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              🧠
            </div>

            <div>
              <span>Skills Identified</span>
              <strong>18</strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              💼
            </div>

            <div>
              <span>Applications</span>
              <strong>7</strong>
            </div>
          </div>
        </section>

        {/* CONTENT */}

        <section className="content-grid">

          {/* QUICK ACTIONS */}

          <div className="panel">
            <div className="panel-header">
              <div>
                <h3>Quick Actions</h3>

                <p>
                  What would you like to do?
                </p>
              </div>
            </div>

            <div className="actions">

              <button
                className="action-card"
                onClick={() =>
                  setPage("resume")
                }
              >
                <span>📄</span>

                <div>
                  <strong>
                    Analyze Resume
                  </strong>

                  <small>
                    Get an AI-powered resume
                    score
                  </small>
                </div>

                <b>→</b>
              </button>

              <button
                className="action-card"
                onClick={() =>
                  setPage("job")
                }
              >
                <span>🎯</span>

                <div>
                  <strong>
                    Match a Job
                  </strong>

                  <small>
                    Compare your skills with
                    a job
                  </small>
                </div>

                <b>→</b>
              </button>

              <button
                className="action-card"
                onClick={() =>
                  setPage("roadmap")
                }
              >
                <span>🗺️</span>

                <div>
                  <strong>
                    Career Roadmap
                  </strong>

                  <small>
                    Build your AI-powered
                    learning path
                  </small>
                </div>

                <b>→</b>
              </button>

              <button
                className="action-card"
                onClick={() =>
                  setPage("interview")
                }
              >
                <span>💬</span>

                <div>
                  <strong>
                    Practice Interview
                  </strong>

                  <small>
                    Prepare with your AI
                    interviewer
                  </small>
                </div>

                <b>→</b>
              </button>

            </div>
          </div>

          {/* SKILLS */}

          <div className="panel">
            <div className="panel-header">
              <div>
                <h3>Skill Progress</h3>

                <p>
                  Your current technical
                  skills
                </p>
              </div>
            </div>

            <div className="skill">
              <div>
                <span>Python</span>
                <strong>85%</strong>
              </div>

              <div className="progress">
                <div
                  style={{
                    width: "85%",
                  }}
                />
              </div>
            </div>

            <div className="skill">
              <div>
                <span>React</span>
                <strong>70%</strong>
              </div>

              <div className="progress">
                <div
                  style={{
                    width: "70%",
                  }}
                />
              </div>
            </div>

            <div className="skill">
              <div>
                <span>
                  Machine Learning
                </span>

                <strong>75%</strong>
              </div>

              <div className="progress">
                <div
                  style={{
                    width: "75%",
                  }}
                />
              </div>
            </div>

            <div className="skill">
              <div>
                <span>FastAPI</span>
                <strong>65%</strong>
              </div>

              <div className="progress">
                <div
                  style={{
                    width: "65%",
                  }}
                />
              </div>
            </div>

          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
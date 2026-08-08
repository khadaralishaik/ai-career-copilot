import { useState } from "react";

interface RoadmapPhase {
  phase: string;
  duration: string;
  focus: string;
  skills: string[];
  projects: string[];
  outcome: string;
}

interface CareerRoadmap {
  target_role: string;
  current_level: string;
  career_summary: string;
  skill_gaps: string[];
  priority_skills: string[];
  roadmap: RoadmapPhase[];
  projects: string[];
  next_steps: string[];
}

function CareerRoadmap() {
  const [file, setFile] = useState<File | null>(null);
  const [targetRole, setTargetRole] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [roadmap, setRoadmap] =
    useState<CareerRoadmap | null>(null);

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFile = event.target.files?.[0];

    if (selectedFile) {
      setFile(selectedFile);
      setMessage("");
      setRoadmap(null);
    }
  };

  const extractResumeData = async () => {
    if (!file) {
      throw new Error("Please select your resume.");
    }

    const formData = new FormData();

    formData.append("file", file);

    const response = await fetch(
      "http://127.0.0.1:8000/api/resume/upload",
      {
        method: "POST",
        body: formData,
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data.message || "Could not process resume."
      );
    }

    return data;
  };

  const handleGenerateRoadmap = async () => {
    if (!file) {
      setMessage("❌ Please select your resume.");
      return;
    }

    if (!targetRole.trim()) {
      setMessage("❌ Please enter your target role.");
      return;
    }

    setLoading(true);
    setMessage("");
    setRoadmap(null);

    try {
      // Extract resume information
      const resumeData = await extractResumeData();

      const resumeAnalysis = resumeData.analysis;

      const resumeText = `
Summary:
${resumeAnalysis.summary}

Skills:
${resumeAnalysis.skills.join(", ")}

Strengths:
${resumeAnalysis.strengths.join(", ")}

Weaknesses:
${resumeAnalysis.weaknesses.join(", ")}

Missing Skills:
${resumeAnalysis.missing_skills.join(", ")}
`;

      // Generate roadmap
      const response = await fetch(
        "http://127.0.0.1:8000/api/career-roadmap",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            resume_text: resumeText,
            target_role: targetRole,
            job_description: jobDescription,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Career roadmap generation failed."
        );
      }

      setRoadmap(data.roadmap);

      setMessage(
        "✅ Your AI career roadmap is ready!"
      );
    } catch (error) {
      console.error(error);

      setMessage(
        `❌ ${
          error instanceof Error
            ? error.message
            : "Something went wrong."
        }`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">

      {/* HEADER */}

      <div className="page-header">
        <p className="welcome">
          AI Career Assistant
        </p>

        <h1>Career Roadmap</h1>

        <p className="page-description">
          Get a personalized AI-powered learning roadmap
          based on your resume and target career.
        </p>
      </div>

      {/* INPUTS */}

      <div className="roadmap-input-grid">

        {/* RESUME */}

        <div className="result-card">
          <h2>📄 Your Resume</h2>

          <p>
            Upload your latest resume.
          </p>

          <label className="upload-button">
            {file
              ? "Change Resume"
              : "Choose Resume"}

            <input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              hidden
            />
          </label>

          {file && (
            <div className="selected-file">
              <span>📎</span>

              <div>
                <strong>{file.name}</strong>

                <small>
                  {(
                    file.size /
                    1024 /
                    1024
                  ).toFixed(2)}{" "}
                  MB
                </small>
              </div>
            </div>
          )}
        </div>

        {/* TARGET ROLE */}

        <div className="result-card">
          <h2>🎯 Target Role</h2>

          <p>
            What job are you preparing for?
          </p>

          <input
            className="role-input"
            type="text"
            placeholder="Example: AI/ML Engineer"
            value={targetRole}
            onChange={(event) =>
              setTargetRole(event.target.value)
            }
          />
        </div>

      </div>

      {/* OPTIONAL JOB DESCRIPTION */}

      <div className="result-card roadmap-job-card">

        <h2>💼 Job Description (Optional)</h2>

        <p>
          Paste the target job description for a more
          accurate roadmap.
        </p>

        <textarea
          className="job-description-input"
          placeholder="Paste the job description here..."
          value={jobDescription}
          onChange={(event) =>
            setJobDescription(event.target.value)
          }
          rows={8}
        />

      </div>

      {/* BUTTON */}

      <button
        className="analyze-button job-match-button"
        onClick={handleGenerateRoadmap}
        disabled={loading}
      >
        {loading
          ? "Building Your Roadmap..."
          : "Generate Career Roadmap →"}
      </button>

      {/* MESSAGE */}

      {message && (
        <p
          style={{
            marginTop: "18px",
            fontSize: "13px",
          }}
        >
          {message}
        </p>
      )}

      {/* RESULTS */}

      {roadmap && (
        <div className="resume-results">

          {/* OVERVIEW */}

          <div className="result-card">

            <span className="result-label">
              TARGET CAREER
            </span>

            <h2>
              {roadmap.target_role}
            </h2>

            <p>
              <strong>
                Current Level:
              </strong>{" "}
              {roadmap.current_level}
            </p>

            <p className="result-summary">
              {roadmap.career_summary}
            </p>

          </div>

          {/* SKILL GAPS */}

          <div className="results-grid">

            <div className="result-card">
              <h2>⚠️ Skill Gaps</h2>

              <div className="skills-list">
                {roadmap.skill_gaps.map(
                  (skill, index) => (
                    <span
                      className="skill-tag recommended"
                      key={index}
                    >
                      {skill}
                    </span>
                  )
                )}
              </div>
            </div>

            {/* PRIORITY SKILLS */}

            <div className="result-card">
              <h2>🔥 Priority Skills</h2>

              <div className="skills-list">
                {roadmap.priority_skills.map(
                  (skill, index) => (
                    <span
                      className="skill-tag"
                      key={index}
                    >
                      {skill}
                    </span>
                  )
                )}
              </div>
            </div>

          </div>

          {/* ROADMAP */}

          <div className="result-card">

            <h2>
              🗺️ Your Learning Roadmap
            </h2>

            <div className="roadmap-timeline">

              {roadmap.roadmap.map(
                (phase, index) => (
                  <div
                    className="roadmap-phase"
                    key={index}
                  >

                    <div className="phase-number">
                      {index + 1}
                    </div>

                    <div className="phase-content">

                      <div className="phase-header">
                        <h3>
                          {phase.phase}
                        </h3>

                        <span>
                          {phase.duration}
                        </span>
                      </div>

                      <p>
                        <strong>
                          Focus:
                        </strong>{" "}
                        {phase.focus}
                      </p>

                      <h4>
                        Skills
                      </h4>

                      <div className="skills-list">
                        {phase.skills.map(
                          (skill, skillIndex) => (
                            <span
                              className="skill-tag"
                              key={skillIndex}
                            >
                              {skill}
                            </span>
                          )
                        )}
                      </div>

                      <h4>
                        Projects
                      </h4>

                      <ul>
                        {phase.projects.map(
                          (
                            project,
                            projectIndex
                          ) => (
                            <li
                              key={
                                projectIndex
                              }
                            >
                              {project}
                            </li>
                          )
                        )}
                      </ul>

                      <p>
                        <strong>
                          Outcome:
                        </strong>{" "}
                        {phase.outcome}
                      </p>

                    </div>

                  </div>
                )
              )}

            </div>

          </div>

          {/* PROJECT IDEAS */}

          <div className="result-card">

            <h2>
              🚀 Portfolio Projects
            </h2>

            <ol className="suggestions-list">
              {roadmap.projects.map(
                (project, index) => (
                  <li key={index}>
                    {project}
                  </li>
                )
              )}
            </ol>

          </div>

          {/* NEXT STEPS */}

          <div className="result-card">

            <h2>
              ✅ Your Next Steps
            </h2>

            <ol className="suggestions-list">
              {roadmap.next_steps.map(
                (step, index) => (
                  <li key={index}>
                    {step}
                  </li>
                )
              )}
            </ol>

          </div>

        </div>
      )}
    </div>
  );
}

export default CareerRoadmap;
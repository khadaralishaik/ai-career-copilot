import { useState } from "react";

interface JobMatchAnalysis {
  match_score: number;
  match_level: string;
  matching_skills: string[];
  missing_skills: string[];
  matching_requirements: string[];
  missing_requirements: string[];
  recommendations: string[];
}

function JobMatcher() {
  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [analysis, setAnalysis] =
    useState<JobMatchAnalysis | null>(null);

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFile = event.target.files?.[0];

    if (selectedFile) {
      setFile(selectedFile);
      setMessage("");
      setAnalysis(null);
    }
  };

  const extractResumeText = async () => {
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

  const handleAnalyze = async () => {
    if (!file) {
      setMessage("❌ Please select your resume.");
      return;
    }

    if (!jobDescription.trim()) {
      setMessage("❌ Please paste the job description.");
      return;
    }

    setLoading(true);
    setMessage("");
    setAnalysis(null);

    try {
      // Step 1: Extract resume text
      const resumeData = await extractResumeText();

      /*
       * The resume upload endpoint currently returns
       * AI analysis rather than raw text.
       *
       * We'll use the analysis data to build a compact
       * resume representation for job matching.
       */

      const resumeAnalysis = resumeData.analysis;

      const resumeText = `
Skills:
${resumeAnalysis.skills.join(", ")}

Strengths:
${resumeAnalysis.strengths.join(", ")}

Weaknesses:
${resumeAnalysis.weaknesses.join(", ")}

Summary:
${resumeAnalysis.summary}
`;

      // Step 2: Compare resume against job
      const response = await fetch(
        "http://127.0.0.1:8000/api/job-match",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            resume_text: resumeText,
            job_description: jobDescription,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Job matching failed."
        );
      }

      setAnalysis(data.analysis);

      setMessage(
        "✅ Job match analysis completed!"
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

        <h1>Job Match Analyzer</h1>

        <p className="page-description">
          Compare your resume with a job description and
          discover how well your skills match the role.
        </p>
      </div>

      {/* INPUT SECTION */}

      <div className="job-match-input-grid">

        {/* RESUME */}

        <div className="result-card">
          <h2>📄 Your Resume</h2>

          <p>
            Upload the PDF resume you want to compare.
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

        {/* JOB DESCRIPTION */}

        <div className="result-card">
          <h2>💼 Job Description</h2>

          <p>
            Paste the job description below.
          </p>

          <textarea
            className="job-description-input"
            placeholder="Paste the complete job description here..."
            value={jobDescription}
            onChange={(event) =>
              setJobDescription(event.target.value)
            }
            rows={12}
          />
        </div>
      </div>

      {/* ANALYZE BUTTON */}

      <button
        className="analyze-button job-match-button"
        onClick={handleAnalyze}
        disabled={loading}
      >
        {loading
          ? "Analyzing Job Match..."
          : "Analyze Job Match →"}
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

      {analysis && (
        <div className="resume-results">

          {/* SCORE */}

          <div className="result-card score-card">
            <div>
              <span className="result-label">
                Job Match Score
              </span>

              <h2>
                {analysis.match_score}
                <span>/100</span>
              </h2>

              <p>
                {analysis.match_level}
              </p>
            </div>

            <div className="score-circle">
              {analysis.match_score}
            </div>
          </div>

          {/* MATCHING SKILLS */}

          <div className="results-grid">

            <div className="result-card">
              <h2>✅ Matching Skills</h2>

              <div className="skills-list">
                {analysis.matching_skills.length > 0 ? (
                  analysis.matching_skills.map(
                    (skill, index) => (
                      <span
                        className="skill-tag"
                        key={index}
                      >
                        {skill}
                      </span>
                    )
                  )
                ) : (
                  <p>
                    No strong matching skills detected.
                  </p>
                )}
              </div>
            </div>

            {/* MISSING SKILLS */}

            <div className="result-card">
              <h2>⚠️ Missing Skills</h2>

              <div className="skills-list">
                {analysis.missing_skills.length > 0 ? (
                  analysis.missing_skills.map(
                    (skill, index) => (
                      <span
                        className="skill-tag recommended"
                        key={index}
                      >
                        {skill}
                      </span>
                    )
                  )
                ) : (
                  <p>
                    No major missing skills detected.
                  </p>
                )}
              </div>
            </div>

          </div>

          {/* REQUIREMENTS */}

          <div className="results-grid">

            <div className="result-card">
              <h2>✅ Requirements You Match</h2>

              <ul>
                {analysis.matching_requirements.map(
                  (requirement, index) => (
                    <li key={index}>
                      {requirement}
                    </li>
                  )
                )}
              </ul>
            </div>

            <div className="result-card">
              <h2>⚠️ Requirements to Improve</h2>

              <ul>
                {analysis.missing_requirements.map(
                  (requirement, index) => (
                    <li key={index}>
                      {requirement}
                    </li>
                  )
                )}
              </ul>
            </div>

          </div>

          {/* RECOMMENDATIONS */}

          <div className="result-card">
            <h2>💡 AI Recommendations</h2>

            <ol className="suggestions-list">
              {analysis.recommendations.map(
                (recommendation, index) => (
                  <li key={index}>
                    {recommendation}
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

export default JobMatcher;
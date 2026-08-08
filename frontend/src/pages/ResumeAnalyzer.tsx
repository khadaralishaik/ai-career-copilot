import { useState } from "react";

interface ResumeAnalysis {
  resume_score: number;
  summary: string;
  skills: string[];
  strengths: string[];
  weaknesses: string[];
  missing_skills: string[];
  suggestions: string[];
}

function ResumeAnalyzer() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [analysis, setAnalysis] =
    useState<ResumeAnalysis | null>(null);

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

  const handleUpload = async () => {
    if (!file) {
      setMessage("Please select a PDF resume first.");
      return;
    }

    setUploading(true);
    setMessage("");
    setAnalysis(null);

    try {
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
        setMessage(
          `❌ ${data.message || "Resume analysis failed."}`
        );
        return;
      }

      setAnalysis(data.analysis);

      setMessage(
        `✅ ${data.filename} analyzed successfully!`
      );
    } catch (error) {
      console.error("Upload error:", error);

      setMessage(
        "❌ Could not connect to the backend."
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="page">
      {/* HEADER */}

      <div className="page-header">
        <p className="welcome">
          AI Career Assistant
        </p>

        <h1>Resume Analyzer</h1>

        <p className="page-description">
          Upload your resume and get an AI-powered analysis
          of your skills, strengths, weaknesses, and career
          readiness.
        </p>
      </div>

      {/* UPLOAD CARD */}

      <div className="resume-upload-card">
        <div className="upload-icon">
          📄
        </div>

        <h2>Upload your resume</h2>

        <p>
          Upload your PDF resume to start the analysis.
        </p>

        <label className="upload-button">
          {file ? "Change Resume" : "Choose Resume"}

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
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </small>
            </div>
          </div>
        )}

        {file && (
          <button
            className="analyze-button"
            onClick={handleUpload}
            disabled={uploading}
          >
            {uploading
              ? "Analyzing with AI..."
              : "Analyze Resume →"}
          </button>
        )}

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
      </div>

      {/* AI RESULTS */}

      {analysis && (
        <div className="resume-results">

          {/* SCORE */}

          <div className="result-card score-card">
            <div>
              <span className="result-label">
                Resume Score
              </span>

              <h2>
                {analysis.resume_score}
                <span>/100</span>
              </h2>

              <p>
                Overall resume quality and career
                readiness score.
              </p>
            </div>

            <div className="score-circle">
              {analysis.resume_score}
            </div>
          </div>

          {/* SUMMARY */}

          <div className="result-card">
            <h2>📋 AI Summary</h2>

            <p className="result-summary">
              {analysis.summary}
            </p>
          </div>

          {/* SKILLS */}

          <div className="result-card">
            <h2>🧠 Skills Detected</h2>

            <div className="skills-list">
              {analysis.skills.length > 0 ? (
                analysis.skills.map(
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
                <p>No skills detected.</p>
              )}
            </div>
          </div>

          {/* TWO COLUMN SECTION */}

          <div className="results-grid">

            {/* STRENGTHS */}

            <div className="result-card">
              <h2>💪 Strengths</h2>

              <ul>
                {analysis.strengths.map(
                  (strength, index) => (
                    <li key={index}>
                      {strength}
                    </li>
                  )
                )}
              </ul>
            </div>

            {/* WEAKNESSES */}

            <div className="result-card">
              <h2>⚠️ Areas to Improve</h2>

              <ul>
                {analysis.weaknesses.map(
                  (weakness, index) => (
                    <li key={index}>
                      {weakness}
                    </li>
                  )
                )}
              </ul>
            </div>

          </div>

          {/* MISSING SKILLS */}

          <div className="result-card">
            <h2>🎯 Recommended Skills</h2>

            <p>
              Skills worth learning or strengthening
              based on your current profile.
            </p>

            <div className="skills-list">
              {analysis.missing_skills.map(
                (skill, index) => (
                  <span
                    className="skill-tag recommended"
                    key={index}
                  >
                    + {skill}
                  </span>
                )
              )}
            </div>
          </div>

          {/* SUGGESTIONS */}

          <div className="result-card">
            <h2>💡 AI Recommendations</h2>

            <ol className="suggestions-list">
              {analysis.suggestions.map(
                (suggestion, index) => (
                  <li key={index}>
                    {suggestion}
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

export default ResumeAnalyzer;
import { useState } from "react";
import { jsPDF } from "jspdf";

interface ImprovementStep {
  step: number;
  title: string;
  problem: string;
  action: string;
  priority: string;
}

interface ResumeAnalysis {
  resume_score: number;
  summary: string;
  skills: string[];
  strengths: string[];
  weaknesses: string[];
  missing_skills: string[];
  suggestions: string[];
  improvement_steps: ImprovementStep[];
}

interface ImproveResponse {
  success: boolean;
  message?: string;
  result?: string;
  improved_score?: number;
  improved_resume?: string;
}

function ResumeAnalyzer() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [improving, setImproving] = useState(false);

  const [message, setMessage] = useState("");
  const [improvementMessage, setImprovementMessage] = useState("");

  const [resumeText, setResumeText] = useState("");
  const [analysis, setAnalysis] =
    useState<ResumeAnalysis | null>(null);

  const [improvedResume, setImprovedResume] = useState("");
  const [improvedScore, setImprovedScore] =
    useState<number | null>(null);

  // =========================================================
  // FILE SELECTION
  // =========================================================

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) return;

    if (selectedFile.type !== "application/pdf") {
      setMessage("❌ Please select a PDF resume.");
      return;
    }

    setFile(selectedFile);
    setMessage("");
    setImprovementMessage("");

    setAnalysis(null);
    setResumeText("");
    setImprovedResume("");
    setImprovedScore(null);
  };

  // =========================================================
  // UPLOAD + ANALYZE
  // =========================================================

  const handleUpload = async () => {
    if (!file) {
      setMessage("❌ Please select a PDF resume first.");
      return;
    }

    setUploading(true);
    setMessage("");
    setAnalysis(null);
    setImprovedResume("");
    setImprovedScore(null);

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

      setResumeText(data.resume_text || "");

      setAnalysis({
        resume_score: data.analysis?.resume_score ?? 0,
        summary: data.analysis?.summary ?? "",
        skills: data.analysis?.skills ?? [],
        strengths: data.analysis?.strengths ?? [],
        weaknesses: data.analysis?.weaknesses ?? [],
        missing_skills: data.analysis?.missing_skills ?? [],
        suggestions: data.analysis?.suggestions ?? [],
        improvement_steps:
          data.analysis?.improvement_steps ?? [],
      });

      setMessage(
        `✅ ${data.filename || file.name} analyzed successfully!`
      );
    } catch (error) {
      console.error("Upload error:", error);

      setMessage(
        "❌ Could not connect to the backend. Make sure FastAPI is running."
      );
    } finally {
      setUploading(false);
    }
  };

  // =========================================================
  // EXTRACT SCORE
  // =========================================================

  const extractScore = (text: string): number | null => {
    if (!text) return null;

    const patterns = [
      /Overall\s+Score\s*:\s*(\d{1,3})\s*\/?\s*100/i,
      /Improved\s+Score\s*:\s*(\d{1,3})\s*\/?\s*100/i,
      /Resume\s+Score\s*:\s*(\d{1,3})\s*\/?\s*100/i,
      /Score\s*:\s*(\d{1,3})\s*\/?\s*100/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);

      if (match) {
        const score = Number(match[1]);

        if (score >= 0 && score <= 100) {
          return score;
        }
      }
    }

    return null;
  };

  // =========================================================
  // EXTRACT ACTUAL RESUME
  // =========================================================

  const extractImprovedResume = (text: string): string => {
    if (!text) return "";

    let result = text.trim();

    const resumeMatch = result.match(
      /(?:^|\n)\s*RESUME\s*:\s*/i
    );

    if (resumeMatch && resumeMatch.index !== undefined) {
      result = result
        .substring(
          resumeMatch.index + resumeMatch[0].length
        )
        .trim();
    }

    result = result.replace(
      /^```(?:text|markdown)?/i,
      ""
    );

    result = result.replace(/```$/i, "");

    return result.trim();
  };

  // =========================================================
  // IMPROVE RESUME
  // =========================================================

  const handleImproveResume = async () => {
    if (!resumeText.trim()) {
      setImprovementMessage(
        "❌ Please analyze your resume first."
      );
      return;
    }

    setImproving(true);
    setImprovementMessage("");
    setImprovedResume("");
    setImprovedScore(null);

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/api/resume/improve",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            resume_text: resumeText,
          }),
        }
      );

      const data: ImproveResponse =
        await response.json();

      if (!response.ok || !data.success) {
        setImprovementMessage(
          `❌ ${
            data.message ||
            "Failed to improve resume."
          }`
        );
        return;
      }

      const rawResult = data.result || "";

      const score =
        data.improved_score ??
        extractScore(rawResult);

      const resume =
        data.improved_resume ||
        extractImprovedResume(rawResult);

      if (!resume) {
        setImprovementMessage(
          "❌ AI returned an empty improved resume."
        );
        return;
      }

      setImprovedScore(score);
      setImprovedResume(resume);

      setImprovementMessage(
        "🎉 Your resume has been improved by AI!"
      );
    } catch (error) {
      console.error(
        "Resume improvement error:",
        error
      );

      setImprovementMessage(
        "❌ Could not connect to the backend."
      );
    } finally {
      setImproving(false);
    }
  };

  // =========================================================
  // DOWNLOAD TXT
  // =========================================================

  const downloadTXT = () => {
    if (!improvedResume) return;

    const blob = new Blob(
      [improvedResume],
      {
        type: "text/plain;charset=utf-8",
      }
    );

    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = "AI_Improved_Resume.txt";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    window.URL.revokeObjectURL(url);
  };

  // =========================================================
  // DOWNLOAD PDF
  // =========================================================

  const downloadPDF = () => {
    if (!improvedResume) return;

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 18;

    const usableWidth =
      pageWidth - margin * 2;

    const lineHeight = 5.5;

    let y = 20;

    const checkPage = (height = 10) => {
      if (y + height > pageHeight - 15) {
        pdf.addPage();
        y = 20;
      }
    };

    const paragraphs =
      improvedResume.split("\n");

    paragraphs.forEach((paragraph) => {
      const line = paragraph.trim();

      if (!line) {
        y += 4;
        checkPage();
        return;
      }

      const isHeading =
        /^[A-Z][A-Z\s&/]{2,}$/.test(line) ||
        /^(SUMMARY|SKILLS|EXPERIENCE|PROJECTS|EDUCATION|CERTIFICATIONS|TECHNICAL SKILLS|WORK EXPERIENCE|INTERNSHIPS|ACHIEVEMENTS)$/i.test(
          line
        );

      if (isHeading) {
        checkPage(12);

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(11);

        y += 2;

        pdf.text(
          line,
          margin,
          y
        );

        y += 7;

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);

        return;
      }

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);

      const wrappedLines =
        pdf.splitTextToSize(
          line,
          usableWidth
        );

      wrappedLines.forEach(
        (textLine: string) => {
          checkPage(lineHeight);

          pdf.text(
            textLine,
            margin,
            y
          );

          y += lineHeight;
        }
      );
    });

    pdf.save("AI_Improved_Resume.pdf");
  };

  // =========================================================
  // RETURN UI
  // =========================================================

  return (
    <div className="resume-analyzer">

      {/* HEADER */}

      <div className="page-header">

        <p className="welcome">
          AI Career Assistant
        </p>

        <h1>
          Resume Analyzer
        </h1>

        <p className="page-description">
          Upload your resume and get an AI-powered
          analysis, ATS score, improvement plan,
          rewritten resume, and downloadable PDF.
        </p>

      </div>

      {/* UPLOAD */}

      <div className="resume-upload-card">

        <div className="upload-icon">
          📄
        </div>

        <h2>
          Upload your resume
        </h2>

        <p>
          Upload your PDF resume to analyze
          and improve it with AI.
        </p>

        <label className="upload-button">

          {file
            ? "Change Resume"
            : "Choose Resume"}

          <input
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileChange}
            hidden
          />

        </label>

        {file && (
          <div className="selected-file">

            <span>📎</span>

            <div>

              <strong>
                {file.name}
              </strong>

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

      {/* RESULTS */}

      {analysis && (
        <div className="resume-results">

          {/* ORIGINAL SCORE */}

          <div className="result-card score-card">

            <div>

              <span className="result-label">
                Original Resume Score
              </span>

              <h2>
                {analysis.resume_score}
                <span>/100</span>
              </h2>

              <p>
                Your current resume quality
                and ATS readiness.
              </p>

            </div>

            <div className="score-circle">
              {analysis.resume_score}
            </div>

          </div>

          {/* STEP-BY-STEP IMPROVEMENT PLAN */}

          <div className="result-card">

            <h2>
              🛠️ Step-by-Step Improvement Plan
            </h2>

            <p>
              Follow these specific steps to improve
              your resume and increase its ATS readiness.
            </p>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                marginTop: "22px",
              }}
            >

              {analysis.improvement_steps?.length > 0 ? (

                analysis.improvement_steps.map(
                  (item, index) => (

                    <div
                      key={item.step ?? index}
                      style={{
                        display: "flex",
                        gap: "16px",
                        padding: "20px",
                        border:
                          "1px solid #e5e7eb",
                        borderRadius: "14px",
                        background: "#fafbff",
                      }}
                    >

                      {/* NUMBER */}

                      <div
                        style={{
                          minWidth: "42px",
                          width: "42px",
                          height: "42px",
                          borderRadius: "50%",
                          background: "#5146e5",
                          color: "#ffffff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 700,
                          fontSize: "16px",
                        }}
                      >
                        {item.step ?? index + 1}
                      </div>

                      {/* CONTENT */}

                      <div
                        style={{
                          flex: 1,
                        }}
                      >

                        <div
                          style={{
                            display: "flex",
                            justifyContent:
                              "space-between",
                            alignItems: "center",
                            gap: "12px",
                            flexWrap: "wrap",
                          }}
                        >

                          <h3
                            style={{
                              margin: 0,
                              fontSize: "18px",
                            }}
                          >
                            {item.title}
                          </h3>

                          <span
                            style={{
                              fontSize: "12px",
                              fontWeight: 700,
                              padding:
                                "5px 10px",
                              borderRadius:
                                "20px",
                              background:
                                item.priority
                                  ?.toLowerCase() ===
                                "high"
                                  ? "#fee2e2"
                                  : "#fef3c7",
                              color:
                                item.priority
                                  ?.toLowerCase() ===
                                "high"
                                  ? "#b91c1c"
                                  : "#92400e",
                            }}
                          >
                            {item.priority}
                          </span>

                        </div>

                        <p
                          style={{
                            margin:
                              "10px 0 6px",
                          }}
                        >
                          <strong>
                            Problem:
                          </strong>{" "}
                          {item.problem}
                        </p>

                        <p
                          style={{
                            margin: 0,
                          }}
                        >
                          <strong>
                            What to do:
                          </strong>{" "}
                          {item.action}
                        </p>

                      </div>

                    </div>

                  )
                )

              ) : (

                <p>
                  No step-by-step improvement
                  plan was generated.
                </p>

              )}

            </div>

          </div>

          {/* IMPROVE RESUME */}

          <div className="result-card improve-card">

            <h2>
              🚀 Improve Your Resume
            </h2>

            <p>
              AI will rewrite your actual resume
              using the weaknesses and recommendations
              found during analysis.
            </p>

            <button
              className="analyze-button"
              onClick={handleImproveResume}
              disabled={improving}
            >
              {improving
                ? "✨ AI is rewriting your resume..."
                : "✨ Improve My Resume"}
            </button>

            {improvementMessage && (
              <p
                style={{
                  marginTop: "18px",
                  fontSize: "14px",
                }}
              >
                {improvementMessage}
              </p>
            )}

          </div>

          {/* IMPROVED SCORE + DOWNLOAD */}

          {improvedResume && (
            <>

              <div className="result-card score-card">

                <div>

                  <span className="result-label">
                    Improved Resume Score
                  </span>

                  <h2>

                    {improvedScore !== null
                      ? improvedScore
                      : "—"}

                    <span>
                      /100
                    </span>

                  </h2>

                  {improvedScore !== null &&
                    improvedScore >
                      analysis.resume_score && (
                      <p>
                        🎉 Your score increased by{" "}
                        {improvedScore -
                          analysis.resume_score}{" "}
                        points.
                      </p>
                    )}

                  {improvedScore !== null &&
                    improvedScore <=
                      analysis.resume_score && (
                      <p>
                        The AI optimized the resume
                        while preserving your actual
                        information.
                      </p>
                    )}

                </div>

                <div className="score-circle">
                  {improvedScore !== null
                    ? improvedScore
                    : "—"}
                </div>

              </div>

              {/* DOWNLOAD */}

              <div className="result-card">

                <h2>
                  📥 Download Your Improved Resume
                </h2>

                <p>
                  Your resume has been rewritten
                  using your actual information.
                </p>

                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    flexWrap: "wrap",
                    marginTop: "20px",
                  }}
                >

                  <button
                    className="analyze-button"
                    onClick={downloadPDF}
                  >
                    📄 Download PDF
                  </button>

                  <button
                    className="analyze-button"
                    onClick={downloadTXT}
                  >
                    📝 Download TXT
                  </button>

                </div>

              </div>

              {/* IMPROVED RESUME */}

              <div className="result-card">

                <h2>
                  ✨ AI Improved Resume
                </h2>

                <p>
                  This is the actual rewritten
                  resume generated from your
                  uploaded resume.
                </p>

                <div
                  style={{
                    marginTop: "20px",
                    padding: "30px",
                    background: "#ffffff",
                    border:
                      "1px solid #e5e7eb",
                    borderRadius: "12px",
                    whiteSpace: "pre-wrap",
                    lineHeight: "1.7",
                    fontSize: "14px",
                    color: "#172033",
                  }}
                >
                  {improvedResume}
                </div>

              </div>

            </>
          )}

          {/* SUMMARY */}

          <div className="result-card">

            <h2>
              📋 AI Summary
            </h2>

            <p className="result-summary">
              {analysis.summary}
            </p>

          </div>

          {/* SKILLS */}

          <div className="result-card">

            <h2>
              🧠 Skills Detected
            </h2>

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

                <p>
                  No skills detected.
                </p>

              )}

            </div>

          </div>

          {/* STRENGTHS + WEAKNESSES */}

          <div className="results-grid">

            <div className="result-card">

              <h2>
                💪 Strengths
              </h2>

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

            <div className="result-card">

              <h2>
                ⚠️ Areas to Improve
              </h2>

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

            <h2>
              🎯 Recommended Skills
            </h2>

            <p>
              Skills worth learning or
              strengthening based on your
              current profile.
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

          {/* RECOMMENDATIONS */}

          <div className="result-card">

            <h2>
              💡 AI Recommendations
            </h2>

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
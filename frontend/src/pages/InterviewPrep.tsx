import { useState } from "react";

interface InterviewQuestion {
  question: string;
  category: string;
  difficulty: string;
  expected_topics: string[];
}

interface Evaluation {
  score: number;
  rating: string;
  strengths: string[];
  weaknesses: string[];
  missing_points: string[];
  feedback: string;
  better_answer: string;
}

function InterviewPrep() {
  const [targetRole, setTargetRole] = useState("");
  const [difficulty, setDifficulty] = useState("Medium");
  const [question, setQuestion] =
    useState<InterviewQuestion | null>(null);

  const [answer, setAnswer] = useState("");
  const [evaluation, setEvaluation] =
    useState<Evaluation | null>(null);

  const [loadingQuestion, setLoadingQuestion] =
    useState(false);

  const [evaluating, setEvaluating] =
    useState(false);

  const [message, setMessage] = useState("");

  const generateQuestion = async () => {
    if (!targetRole.trim()) {
      setMessage("❌ Please enter your target role.");
      return;
    }

    setLoadingQuestion(true);
    setMessage("");
    setQuestion(null);
    setEvaluation(null);
    setAnswer("");

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/api/interview/question",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            target_role: targetRole,
            difficulty,
            resume_text: "",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Failed to generate interview question."
        );
      }

      setQuestion(data.question);
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
      setLoadingQuestion(false);
    }
  };

  const evaluateAnswer = async () => {
    if (!question) {
      return;
    }

    if (!answer.trim()) {
      setMessage("❌ Please write your answer first.");
      return;
    }

    setEvaluating(true);
    setMessage("");
    setEvaluation(null);

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/api/interview/evaluate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            target_role: targetRole,
            question: question.question,
            answer,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Failed to evaluate answer."
        );
      }

      setEvaluation(data.evaluation);

      setMessage(
        "✅ Your answer has been evaluated."
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
      setEvaluating(false);
    }
  };

  const nextQuestion = () => {
    setQuestion(null);
    setAnswer("");
    setEvaluation(null);
    setMessage("");
  };

  return (
    <div className="page">

      {/* HEADER */}

      <div className="page-header">
        <p className="welcome">
          AI Career Assistant
        </p>

        <h1>Interview Prep</h1>

        <p className="page-description">
          Practice realistic interview questions and
          receive AI-powered feedback on your answers.
        </p>
      </div>

      {/* SETUP */}

      {!question && (
        <div className="result-card interview-setup">

          <h2>🎤 Start Your AI Interview</h2>

          <p>
            Choose your target role and interview
            difficulty.
          </p>

          <div className="interview-input-grid">

            <div>
              <label className="input-label">
                Target Role
              </label>

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

            <div>
              <label className="input-label">
                Difficulty
              </label>

              <select
                className="role-input"
                value={difficulty}
                onChange={(event) =>
                  setDifficulty(event.target.value)
                }
              >
                <option value="Easy">
                  Easy
                </option>

                <option value="Medium">
                  Medium
                </option>

                <option value="Hard">
                  Hard
                </option>
              </select>
            </div>

          </div>

          <button
            className="analyze-button job-match-button"
            onClick={generateQuestion}
            disabled={loadingQuestion}
          >
            {loadingQuestion
              ? "Preparing Question..."
              : "Start Interview →"}
          </button>

        </div>
      )}

      {/* QUESTION */}

      {question && (
        <div className="interview-container">

          <div className="result-card">

            <div className="interview-question-header">

              <div>
                <span className="result-label">
                  {question.category}
                </span>

                <h2>
                  Interview Question
                </h2>
              </div>

              <span className="difficulty-badge">
                {question.difficulty}
              </span>

            </div>

            <div className="question-box">
              <p>
                {question.question}
              </p>
            </div>

            <div className="expected-topics">
              <strong>
                Topics the interviewer may expect:
              </strong>

              <div className="skills-list">
                {question.expected_topics.map(
                  (topic, index) => (
                    <span
                      className="skill-tag"
                      key={index}
                    >
                      {topic}
                    </span>
                  )
                )}
              </div>
            </div>

          </div>

          {/* ANSWER */}

          <div className="result-card">

            <h2>✍️ Your Answer</h2>

            <p>
              Explain your answer as if you were
              speaking to a real interviewer.
            </p>

            <textarea
              className="job-description-input interview-answer"
              placeholder="Type your answer here..."
              value={answer}
              onChange={(event) =>
                setAnswer(event.target.value)
              }
              rows={10}
            />

            <button
              className="analyze-button job-match-button"
              onClick={evaluateAnswer}
              disabled={evaluating}
            >
              {evaluating
                ? "AI Is Evaluating..."
                : "Submit Answer →"}
            </button>

          </div>

          {/* EVALUATION */}

          {evaluation && (
            <div className="resume-results">

              <div className="result-card">

                <div className="interview-score">

                  <div className="score-circle">
                    <strong>
                      {evaluation.score}
                    </strong>

                    <span>/100</span>
                  </div>

                  <div>
                    <span className="result-label">
                      INTERVIEW PERFORMANCE
                    </span>

                    <h2>
                      {evaluation.rating}
                    </h2>
                  </div>

                </div>

                <p className="result-summary">
                  {evaluation.feedback}
                </p>

              </div>

              <div className="results-grid">

                <div className="result-card">
                  <h2>✅ Strengths</h2>

                  <ul className="suggestions-list">
                    {evaluation.strengths.map(
                      (item, index) => (
                        <li key={index}>
                          {item}
                        </li>
                      )
                    )}
                  </ul>
                </div>

                <div className="result-card">
                  <h2>⚠️ Areas to Improve</h2>

                  <ul className="suggestions-list">
                    {evaluation.weaknesses.map(
                      (item, index) => (
                        <li key={index}>
                          {item}
                        </li>
                      )
                    )}
                  </ul>
                </div>

              </div>

              <div className="result-card">

                <h2>
                  🎯 Missing Points
                </h2>

                <ul className="suggestions-list">
                  {evaluation.missing_points.map(
                    (item, index) => (
                      <li key={index}>
                        {item}
                      </li>
                    )
                  )}
                </ul>

              </div>

              <div className="result-card">

                <h2>
                  💡 Better Answer
                </h2>

                <p className="better-answer">
                  {evaluation.better_answer}
                </p>

              </div>

              <button
                className="secondary-btn"
                onClick={nextQuestion}
              >
                Next Interview Question →
              </button>

            </div>
          )}

        </div>
      )}

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

    </div>
  );
}

export default InterviewPrep;
# AI Career Copilot

AI Career Copilot is an AI-powered career assistant that helps users analyze resumes, compare resumes with job descriptions, build personalized career roadmaps, and practice interviews.

## ✨ Features

- 📄 **Resume Analyzer** — Upload a PDF resume and get AI-powered analysis.
- 🎯 **Job Matcher** — Compare your resume with a job description.
- 🗺️ **Career Roadmap** — Generate a personalized roadmap for your target role.
- 💬 **Interview Prep** — Generate interview questions and evaluate your answers.
- 🖥️ **Career Dashboard** — Access all career tools from one dashboard.
- 🤖 **RoboApply-style Engine** — Playwright-based application automation for compatible ATS career pages, with deduplication, dry-run mode, screenshots, and human handoff.

## 🤖 Auto-Apply Module

The `auto_apply/` directory contains the job-application engine. It supports direct Greenhouse and Lever flows, best-effort Workday handling, and a generic ATS adapter. It is deliberately modular so additional sites can be added as adapters.

LinkedIn and Indeed are treated as manual-handoff platforms rather than being submitted by an unauthorized bot. Indeed's current terms specifically prohibit bots/scripts that automate Indeed Apply outside its official vendors/tooling.

Start in dry-run mode, verify the jobs and answers, and only enable submission where the target site's rules permit it.

## 🛠️ Tech Stack

### Frontend
- React
- TypeScript
- Vite
- CSS

### Backend
- Python
- FastAPI
- PyMuPDF
- Google Gemini API
- Playwright (auto-apply module)

## 📁 Project Structure

```text
ai-career-copilot/
│
├── frontend/
├── backend/
├── auto_apply/
│   ├── app.py
│   ├── requirements.txt
│   ├── config.example.json
│   ├── .env.example
│   └── data/profile.example.json
└── README.md
```

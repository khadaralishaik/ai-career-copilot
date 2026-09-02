# RoboApply-style Job Automation Engine

A Playwright/FastAPI engine for discovering and applying to compatible job pages with truthful profile data, tailored application content, deduplication, screenshots, and human handoff.

## Supported adapters

- Greenhouse direct career pages
- Lever direct career pages
- Workday career pages (best-effort, requires selectors to evolve with sites)
- Ashby and generic ATS pages through the generic adapter
- LinkedIn/Indeed are intentionally **not automated for submission** in this engine. The UI can hand a matching job to the user for manual completion. Indeed's current terms prohibit unauthorized bots for Indeed Apply.

The adapter system is designed so additional job sites can be added without changing the worker.

## Run

```bash
cd auto_apply
python -m venv .venv
# Windows: .venv\\Scripts\\activate
pip install -r requirements.txt
playwright install chromium
copy .env.example .env
uvicorn app:app --reload
```

Open `http://127.0.0.1:8000/docs` for the API.

## Safety

The engine never invents qualifications, bypasses CAPTCHA/MFA, or attempts anti-bot evasion. If a verification challenge or unsupported question appears, the run is marked `needs_human` and a screenshot is saved.

Start with `DRY_RUN=true` and review jobs before enabling submission.
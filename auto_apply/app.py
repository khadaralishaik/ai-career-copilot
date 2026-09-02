from __future__ import annotations

import asyncio
import hashlib
import json
import os
import re
import sqlite3
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from playwright.async_api import async_playwright, Page

from discovery import discover, public_dicts

load_dotenv()

ROOT = Path(__file__).resolve().parent
DB_PATH = Path(os.getenv("DB_PATH", ROOT / "data/applications.db"))
SCREENSHOT_DIR = Path(os.getenv("SCREENSHOT_DIR", ROOT / "data/screenshots"))
PROFILE_PATH = Path(os.getenv("PROFILE_PATH", ROOT / "data/profile.json"))
DRY_RUN = os.getenv("DRY_RUN", "true").lower() == "true"
HEADLESS = os.getenv("HEADLESS", "false").lower() == "true"
MAX_APPS = int(os.getenv("MAX_APPLICATIONS_PER_RUN", "5"))

DB_PATH.parent.mkdir(parents=True, exist_ok=True)
SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="RoboApply-style Job Automation Engine", version="0.2.0")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])


def db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("""CREATE TABLE IF NOT EXISTS applications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_key TEXT UNIQUE NOT NULL,
        url TEXT NOT NULL,
        company TEXT,
        title TEXT,
        adapter TEXT,
        status TEXT NOT NULL,
        reason TEXT,
        screenshot TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )""")
    return conn


def job_key(url: str) -> str:
    return hashlib.sha256(url.strip().split("?")[0].encode()).hexdigest()


def load_profile() -> dict[str, Any]:
    if not PROFILE_PATH.exists():
        return {}
    return json.loads(PROFILE_PATH.read_text(encoding="utf-8"))


def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip()


@dataclass
class Job:
    url: str
    title: str = ""
    company: str = ""
    description: str = ""
    adapter: str = "generic"


class Adapter:
    name = "generic"

    async def matches(self, page: Page) -> bool:
        return True

    async def extract_job(self, page: Page, url: str) -> Job:
        title = normalize(await page.title())
        body = normalize(await page.locator("body").inner_text(timeout=8000))
        return Job(url=url, title=title, description=body, adapter=self.name)

    async def apply(self, page: Page, profile: dict[str, Any], job: Job, dry_run: bool) -> tuple[str, str]:
        return "needs_human", "No adapter available for this application page"

    async def fill_common(self, page: Page, profile: dict[str, Any]) -> None:
        values = {"first name": profile.get("first_name"), "last name": profile.get("last_name"), "full name": profile.get("full_name"), "name": profile.get("full_name"), "email": profile.get("email"), "phone": profile.get("phone"), "location": profile.get("location"), "linkedin": profile.get("linkedin"), "github": profile.get("github"), "portfolio": profile.get("portfolio")}
        for label, value in values.items():
            if not value:
                continue
            selectors = [f'input[placeholder*="{label}" i]', f'input[name*="{label.replace(" ", "-")}" i]', f'input[id*="{label.replace(" ", "-")}" i]', f'input[aria-label*="{label}" i]']
            for selector in selectors:
                loc = page.locator(selector).first
                try:
                    if await loc.count() and await loc.is_visible():
                        await loc.fill(str(value))
                        break
                except Exception:
                    pass


class GreenhouseAdapter(Adapter):
    name = "greenhouse"
    async def matches(self, page: Page) -> bool:
        host = urlparse(page.url).netloc.lower()
        return "greenhouse.io" in host or "boards.greenhouse" in host
    async def extract_job(self, page: Page, url: str) -> Job:
        body = normalize(await page.locator("body").inner_text(timeout=10000))
        title = normalize(await page.locator("h1").first.inner_text(timeout=5000)) if await page.locator("h1").count() else normalize(await page.title())
        return Job(url=url, title=title, description=body, adapter=self.name)
    async def apply(self, page: Page, profile: dict[str, Any], job: Job, dry_run: bool) -> tuple[str, str]:
        try:
            await page.get_by_text(re.compile(r"^apply", re.I)).first.click()
        except Exception:
            try:
                await page.get_by_role("button", name=re.compile(r"apply", re.I)).first.click()
            except Exception:
                return "needs_human", "Could not open Greenhouse application form"
        await page.wait_for_timeout(800)
        await self.fill_common(page, profile)
        await upload_resume(page, profile)
        return await finish_or_handoff(page, dry_run)


class LeverAdapter(Adapter):
    name = "lever"
    async def matches(self, page: Page) -> bool:
        host = urlparse(page.url).netloc.lower()
        return "jobs.lever.co" in host or "lever.co" in host
    async def extract_job(self, page: Page, url: str) -> Job:
        body = normalize(await page.locator("body").inner_text(timeout=10000))
        title = normalize(await page.locator("h2").first.inner_text(timeout=5000)) if await page.locator("h2").count() else normalize(await page.title())
        return Job(url=url, title=title, description=body, adapter=self.name)
    async def apply(self, page: Page, profile: dict[str, Any], job: Job, dry_run: bool) -> tuple[str, str]:
        try:
            await page.get_by_role("link", name=re.compile(r"apply", re.I)).first.click()
        except Exception:
            try:
                await page.get_by_role("button", name=re.compile(r"apply", re.I)).first.click()
            except Exception:
                return "needs_human", "Could not open Lever application form"
        await page.wait_for_timeout(800)
        await self.fill_common(page, profile)
        await upload_resume(page, profile)
        return await finish_or_handoff(page, dry_run)


class WorkdayAdapter(Adapter):
    name = "workday"
    async def matches(self, page: Page) -> bool:
        host = urlparse(page.url).netloc.lower()
        return "myworkdayjobs.com" in host or "workdayjobs" in host
    async def apply(self, page: Page, profile: dict[str, Any], job: Job, dry_run: bool) -> tuple[str, str]:
        await self.fill_common(page, profile)
        await upload_resume(page, profile)
        if await page.get_by_text(re.compile(r"captcha|verify you are human|security check", re.I)).count():
            return "needs_human", "Human verification detected"
        return "needs_human", "Workday tenant requires a site-specific form adapter"


class GenericATSAdapter(Adapter):
    name = "generic"
    async def apply(self, page: Page, profile: dict[str, Any], job: Job, dry_run: bool) -> tuple[str, str]:
        if await page.get_by_text(re.compile(r"captcha|verify you are human|security check", re.I)).count():
            return "needs_human", "Human verification detected"
        await self.fill_common(page, profile)
        await upload_resume(page, profile)
        return await finish_or_handoff(page, dry_run)


ADAPTERS = [GreenhouseAdapter(), LeverAdapter(), WorkdayAdapter(), GenericATSAdapter()]


async def choose_adapter(page: Page) -> Adapter:
    for adapter in ADAPTERS:
        if await adapter.matches(page):
            return adapter
    return GenericATSAdapter()


async def upload_resume(page: Page, profile: dict[str, Any]) -> None:
    resume = profile.get("resume_path")
    if not resume:
        return
    path = Path(resume)
    if not path.exists():
        return
    try:
        inputs = page.locator('input[type="file"]')
        for i in range(await inputs.count()):
            loc = inputs.nth(i)
            if await loc.is_visible():
                await loc.set_input_files(str(path))
                return
    except Exception:
        pass


async def finish_or_handoff(page: Page, dry_run: bool) -> tuple[str, str]:
    if dry_run:
        return "preview", "Dry-run mode; application was not submitted"
    if await page.get_by_text(re.compile(r"captcha|verify you are human|security check", re.I)).count():
        return "needs_human", "Human verification detected"
    candidates = [page.get_by_role("button", name=re.compile(r"submit application|submit|send application", re.I)), page.locator('button[type="submit"]'), page.locator('input[type="submit"]')]
    for loc in candidates:
        try:
            if await loc.count() and await loc.first.is_visible():
                await loc.first.click()
                await page.wait_for_timeout(1200)
                return "applied", "Application submitted"
        except Exception:
            continue
    return "needs_human", "No reliable submit control was detected"


class JobRequest(BaseModel):
    urls: list[str] = Field(min_length=1)
    auto_submit: bool | None = None


class DiscoveryRequest(BaseModel):
    greenhouse: list[str] = Field(default_factory=list)
    lever: list[str] = Field(default_factory=list)
    ashby: list[str] = Field(default_factory=list)
    minimum_score: int = Field(default=0, ge=0, le=100)
    max_results: int = Field(default=50, ge=1, le=200)


@app.get("/")
def root():
    return {"service": "roboapply-engine", "dry_run": DRY_RUN}


@app.get("/api/applications")
def applications(limit: int = 100):
    conn = db()
    rows = conn.execute("SELECT * FROM applications ORDER BY id DESC LIMIT ?", (limit,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.post("/api/jobs/discover")
def discover_jobs(request: DiscoveryRequest):
    profile = load_profile()
    if not profile:
        raise HTTPException(400, "Create auto_apply/data/profile.json before discovering jobs")
    config = {"greenhouse": request.greenhouse, "lever": request.lever, "ashby": request.ashby}
    jobs = [job for job in discover(config, profile) if job.score >= request.minimum_score][:request.max_results]
    return {"count": len(jobs), "jobs": public_dicts(jobs)}


@app.post("/api/jobs/run")
async def run_jobs(request: JobRequest):
    profile = load_profile()
    if not profile:
        raise HTTPException(400, "Create auto_apply/data/profile.json before running")
    if len(request.urls) > MAX_APPS:
        raise HTTPException(400, f"Maximum URLs per run is {MAX_APPS}")
    effective_dry_run = True if request.auto_submit is None else not request.auto_submit
    results = []
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=HEADLESS)
        context = await browser.new_context()
        page = await context.new_page()
        for url in request.urls:
            key = job_key(url)
            conn = db()
            existing = conn.execute("SELECT status FROM applications WHERE job_key=?", (key,)).fetchone()
            conn.close()
            if existing:
                results.append({"url": url, "status": "duplicate"})
                continue
            try:
                await page.goto(url, wait_until="domcontentloaded", timeout=30000)
                adapter = await choose_adapter(page)
                job = await adapter.extract_job(page, url)
                status, reason = await adapter.apply(page, profile, job, effective_dry_run)
                shot = None
                if status == "needs_human":
                    shot_path = SCREENSHOT_DIR / f"{key}.png"
                    await page.screenshot(path=str(shot_path), full_page=True)
                    shot = str(shot_path)
                conn = db()
                conn.execute("INSERT INTO applications(job_key,url,company,title,adapter,status,reason,screenshot) VALUES(?,?,?,?,?,?,?,?)", (key, url, job.company, job.title, adapter.name, status, reason, shot))
                conn.commit(); conn.close()
                results.append({"url": url, "title": job.title, "adapter": adapter.name, "status": status, "reason": reason, "screenshot": shot})
            except Exception as exc:
                shot_path = SCREENSHOT_DIR / f"{key}-error.png"
                try:
                    await page.screenshot(path=str(shot_path), full_page=True)
                except Exception:
                    shot_path = None
                conn = db(); conn.execute("INSERT INTO applications(job_key,url,adapter,status,reason,screenshot) VALUES(?,?,?,?,?,?)", (key, url, "unknown", "failed", str(exc), str(shot_path) if shot_path else None)); conn.commit(); conn.close()
                results.append({"url": url, "status": "failed", "reason": str(exc)})
        await context.close(); await browser.close()
    return {"dry_run": effective_dry_run, "results": results}


@app.post("/api/config/check")
def config_check():
    profile = load_profile()
    required = ["full_name", "email", "phone", "resume_path"]
    missing = [x for x in required if not profile.get(x)]
    return {"valid": not missing, "missing": missing, "profile_path": str(PROFILE_PATH)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)

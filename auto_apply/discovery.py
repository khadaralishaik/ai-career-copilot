from __future__ import annotations

import json
import re
from dataclasses import dataclass, asdict
from urllib.parse import urlparse
from urllib.request import Request, urlopen


@dataclass
class Job:
    title: str
    company: str
    location: str
    url: str
    source: str
    description: str = ""
    remote: bool = False
    salary: str = ""
    score: int = 0


def fetch_json(url: str) -> dict:
    req = Request(url, headers={"User-Agent": "AI-Career-Copilot/1.0"})
    with urlopen(req, timeout=20) as response:
        return json.loads(response.read().decode("utf-8"))


def greenhouse(board: str) -> list[Job]:
    data = fetch_json(f"https://boards-api.greenhouse.io/v1/boards/{board}/jobs?content=true")
    return [Job(j.get("title", ""), board, ", ".join(o.get("name", "") for o in j.get("offices", [])), j.get("absolute_url", ""), "greenhouse", re.sub("<[^>]+>", " ", j.get("content", ""))) for j in data.get("jobs", [])]


def lever(company: str) -> list[Job]:
    data = fetch_json(f"https://api.lever.co/v0/postings/{company}?mode=json")
    jobs = []
    for j in data if isinstance(data, list) else []:
        jobs.append(Job(j.get("text", ""), company, j.get("categories", {}).get("location", ""), j.get("hostedUrl", ""), "lever", j.get("descriptionPlain", ""), bool(j.get("workplaceType") == "remote"), str(j.get("salaryRange", ""))))
    return jobs


def ashby(board: str) -> list[Job]:
    data = fetch_json(f"https://api.ashbyhq.com/posting-api/job-board/{board}?includeCompensation=true")
    jobs = []
    for j in data.get("jobs", []):
        jobs.append(Job(j.get("title", ""), board, j.get("location", ""), j.get("jobUrl", ""), "ashby", j.get("descriptionPlain", ""), bool(j.get("isRemote")), (j.get("compensation") or {}).get("scrapeableCompensationSalarySummary", "")))
    return jobs


def score_job(job: Job, profile: dict) -> int:
    text = f"{job.title} {job.description}".lower()
    skills = profile.get("skills", [])
    if isinstance(skills, str):
        skills = [skills]
    wanted = [str(x).lower() for x in skills]
    hits = sum(1 for skill in wanted if skill and skill in text)
    score = round(100 * hits / max(len(wanted), 1))
    titles = profile.get("target_titles", [])
    if isinstance(titles, str):
        titles = [titles]
    if any(str(t).lower() in job.title.lower() for t in titles):
        score = min(100, score + 20)
    locations = profile.get("target_locations", [])
    if isinstance(locations, str):
        locations = [locations]
    if job.remote and profile.get("remote_ok", True):
        score = min(100, score + 10)
    elif locations and not any(str(x).lower() in job.location.lower() for x in locations):
        score = max(0, score - 15)
    job.score = score
    return score


def discover(config: dict, profile: dict) -> list[Job]:
    jobs: list[Job] = []
    for board in config.get("greenhouse", []):
        try: jobs.extend(greenhouse(board))
        except Exception: pass
    for company in config.get("lever", []):
        try: jobs.extend(lever(company))
        except Exception: pass
    for board in config.get("ashby", []):
        try: jobs.extend(ashby(board))
        except Exception: pass
    for job in jobs:
        score_job(job, profile)
    return sorted(jobs, key=lambda j: j.score, reverse=True)


def public_dicts(jobs: list[Job]) -> list[dict]:
    return [asdict(j) for j in jobs]

from __future__ import annotations

import json
import re
from dataclasses import dataclass, asdict
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse
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


def fetch_text(url: str) -> str:
    req = Request(url, headers={"User-Agent": "Mozilla/5.0 (compatible; AI-Career-Copilot/1.0)"})
    with urlopen(req, timeout=20) as response:
        return response.read().decode("utf-8", errors="ignore")


def fetch_json(url: str) -> dict:
    return json.loads(fetch_text(url))


def greenhouse(board: str) -> list[Job]:
    data = fetch_json(f"https://boards-api.greenhouse.io/v1/boards/{board}/jobs?content=true")
    return [Job(j.get("title", ""), board, ", ".join(o.get("name", "") for o in j.get("offices", [])), j.get("absolute_url", ""), "greenhouse", re.sub("<[^>]+>", " ", j.get("content", ""))) for j in data.get("jobs", [])]


def lever(company: str) -> list[Job]:
    data = fetch_json(f"https://api.lever.co/v0/postings/{company}?mode=json")
    return [Job(j.get("text", ""), company, j.get("categories", {}).get("location", ""), j.get("hostedUrl", ""), "lever", j.get("descriptionPlain", ""), bool(j.get("workplaceType") == "remote"), str(j.get("salaryRange", ""))) for j in data if isinstance(data, list)]


def ashby(board: str) -> list[Job]:
    data = fetch_json(f"https://api.ashbyhq.com/posting-api/job-board/{board}?includeCompensation=true")
    return [Job(j.get("title", ""), board, j.get("location", ""), j.get("jobUrl", ""), "ashby", j.get("descriptionPlain", ""), bool(j.get("isRemote")), (j.get("compensation") or {}).get("scrapeableCompensationSalarySummary", "")) for j in data.get("jobs", [])]


class _LinkParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.links: list[tuple[str, str]] = []
        self._href = ""
        self._text: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() == "a":
            self._href = dict(attrs).get("href") or ""
            self._text = []

    def handle_data(self, data: str) -> None:
        if self._href:
            self._text.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == "a" and self._href:
            text = re.sub(r"\s+", " ", " ".join(self._text)).strip()
            self.links.append((self._href, text))
            self._href, self._text = "", []


def freshershunt(url: str = "https://freshershunt.in/off-campus-drive-jobs/", max_pages: int = 50) -> list[Job]:
    """Import job/article links from FreshersHunt without submitting anything on that site."""
    seen_pages: set[str] = set()
    seen_jobs: set[str] = set()
    jobs: list[Job] = []
    page_url = url
    for _ in range(max_pages):
        if page_url in seen_pages:
            break
        seen_pages.add(page_url)
        try:
            parser = _LinkParser(); parser.feed(fetch_text(page_url))
        except Exception:
            break
        next_page = ""
        for href, text in parser.links:
            absolute = urljoin(page_url, href).split("#", 1)[0]
            parsed = urlparse(absolute)
            if parsed.netloc and parsed.netloc != urlparse(url).netloc:
                continue
            label = text.strip()
            low = f"{label} {absolute}".lower()
            if "next" in label.lower() and "/page/" in absolute:
                next_page = absolute
                continue
            if not absolute.startswith(url.rstrip("/")):
                continue
            if absolute.rstrip("/") == url.rstrip("/") or absolute in seen_jobs:
                continue
            # FreshersHunt article links are the useful application-source records.
            if any(word in low for word in ("off campus", "hiring", "careers", "software", "engineer", "developer", "intern", "analyst", "trainee", "associate", "graduate", "drive", "jobs")):
                seen_jobs.add(absolute)
                jobs.append(Job(label or "FreshersHunt job", "", "India", absolute, "freshershunt"))
        if not next_page:
            break
        page_url = next_page
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
    elif locations and job.location and not any(str(x).lower() in job.location.lower() for x in locations):
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
    for source_url in config.get("freshershunt", []):
        try: jobs.extend(freshershunt(source_url, max_pages=int(config.get("freshershunt_max_pages", 50))))
        except Exception: pass
    for job in jobs:
        score_job(job, profile)
    return sorted(jobs, key=lambda j: j.score, reverse=True)


def public_dicts(jobs: list[Job]) -> list[dict]:
    return [asdict(j) for j in jobs]

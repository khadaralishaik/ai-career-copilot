import os
import json

from google import genai
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise ValueError("GEMINI_API_KEY is missing from .env")

client = genai.Client(api_key=api_key)


def generate_career_roadmap(
    resume_text: str,
    target_role: str,
    job_description: str = ""
) -> dict:

    prompt = f"""
You are an expert career coach and technical learning advisor.

Create a practical career roadmap for the candidate based ONLY
on the provided resume, target role, and job description.

Return ONLY valid JSON.
Do not use markdown.
Do not include ```json.

Return exactly this structure:

{{
    "target_role": "",
    "current_level": "",
    "career_summary": "",
    "skill_gaps": [],
    "priority_skills": [],
    "roadmap": [
        {{
            "phase": "",
            "duration": "",
            "focus": "",
            "skills": [],
            "projects": [],
            "outcome": ""
        }}
    ],
    "projects": [],
    "next_steps": []
}}

Rules:

- Do not invent qualifications.
- Identify realistic skill gaps.
- Prioritize skills based on the target role.
- Make the roadmap practical for a student or early-career candidate.
- Recommend projects that can be added to a portfolio.
- Keep the roadmap focused on employability.
- Give 3 to 5 roadmap phases.
- Each phase should have a realistic duration.
- Give 3 to 6 priority skills.
- Give 3 to 5 project ideas.
- Give 5 clear next steps.

CANDIDATE RESUME:

{resume_text}

TARGET ROLE:

{target_role}

JOB DESCRIPTION:

{job_description}
"""

    response = client.models.generate_content(
        model="gemini-3.5-flash-lite",
        contents=prompt,
    )

    raw_text = response.text.strip()

    if raw_text.startswith("```json"):
        raw_text = raw_text[7:]

    if raw_text.startswith("```"):
        raw_text = raw_text[3:]

    if raw_text.endswith("```"):
        raw_text = raw_text[:-3]

    raw_text = raw_text.strip()

    try:
        return json.loads(raw_text)

    except json.JSONDecodeError:

        return {
            "target_role": target_role,
            "current_level": "Unable to determine",
            "career_summary": "",
            "skill_gaps": [],
            "priority_skills": [],
            "roadmap": [],
            "projects": [],
            "next_steps": [],
            "raw_response": raw_text,
        }
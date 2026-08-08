import os
import json

from google import genai
from dotenv import load_dotenv


load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise ValueError("GEMINI_API_KEY is missing from .env")


client = genai.Client(api_key=api_key)


def match_resume_to_job(
    resume_text: str,
    job_description: str
) -> dict:

    prompt = f"""
You are an expert technical recruiter and career advisor.

Compare the candidate's resume against the job description.

Return ONLY valid JSON.
Do not use markdown.
Do not include ```json.
Do not add explanations outside the JSON.

Return exactly this structure:

{{
    "match_score": 0,
    "match_level": "",
    "matching_skills": [],
    "missing_skills": [],
    "matching_requirements": [],
    "missing_requirements": [],
    "recommendations": []
}}

Rules:

- match_score must be an integer from 0 to 100.
- match_level should be one of:
  "Excellent Match",
  "Strong Match",
  "Moderate Match",
  "Weak Match"
- matching_skills should contain skills present in both the resume and job description.
- missing_skills should contain important skills requested by the job that are not clearly present in the resume.
- matching_requirements should identify job requirements the candidate appears to satisfy.
- missing_requirements should identify important requirements that the resume does not demonstrate.
- recommendations should provide practical actions the candidate can take to improve their application.
- Do not invent experience or qualifications.
- Base your analysis only on the provided resume and job description.

CANDIDATE RESUME:

{resume_text}


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
            "match_score": 0,
            "match_level": "Unable to Analyze",
            "matching_skills": [],
            "missing_skills": [],
            "matching_requirements": [],
            "missing_requirements": [],
            "recommendations": [],
            "raw_response": raw_text,
        }
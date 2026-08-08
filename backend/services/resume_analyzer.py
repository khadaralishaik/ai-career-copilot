import os
import json
from google import genai
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise ValueError("GEMINI_API_KEY is missing from .env")

client = genai.Client(api_key=api_key)


def analyze_resume(resume_text: str) -> dict:

    prompt = f"""
You are an expert technical recruiter and resume analyst.

Analyze the following resume carefully.

Return ONLY valid JSON.
Do not use markdown.
Do not include ```json.
Do not add explanations outside the JSON.

The JSON must contain exactly these fields:

{{
    "resume_score": 0,
    "summary": "",
    "skills": [],
    "strengths": [],
    "weaknesses": [],
    "missing_skills": [],
    "suggestions": []
}}

Rules:

- resume_score must be an integer from 0 to 100.
- summary should be a short professional assessment.
- skills should contain technical and professional skills explicitly found in the resume.
- strengths should contain specific positive observations.
- weaknesses should contain specific areas that need improvement.
- missing_skills should contain useful skills that appear absent or insufficient for a modern software/AI career.
- suggestions should contain practical resume improvement recommendations.
- Do not invent experience, education, certifications, or projects.
- Base your analysis only on the resume content.

RESUME:

{resume_text}
"""

    response = client.models.generate_content(
        model="gemini-3.5-flash-lite",
        contents=prompt,
    )

    raw_text = response.text.strip()

    # Remove accidental markdown formatting
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
            "resume_score": 0,
            "summary": "The AI returned an invalid analysis format.",
            "skills": [],
            "strengths": [],
            "weaknesses": [],
            "missing_skills": [],
            "suggestions": [],
            "raw_response": raw_text,
        }
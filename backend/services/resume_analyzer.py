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
You are an expert technical recruiter, ATS specialist, and resume analyst.

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
    "suggestions": [],
    "improvement_steps": []
}}

IMPORTANT RULES:

- resume_score must be an integer from 0 to 100.
- summary should be a short professional assessment.
- skills should contain technical and professional skills explicitly found in the resume.
- strengths should contain specific positive observations.
- weaknesses should contain specific areas that need improvement.
- missing_skills should contain useful skills that appear absent or insufficient.
- suggestions should contain practical resume improvement recommendations.
- improvement_steps must contain clear, actionable steps the candidate can take.
- Do NOT invent companies.
- Do NOT invent jobs.
- Do NOT invent education.
- Do NOT invent certifications.
- Do NOT invent projects.
- Do NOT invent technologies.
- Do NOT invent achievements.
- Do NOT invent metrics.
- Do NOT invent experience.
- Base your analysis only on the resume content.

SCORING SHOULD CONSIDER:

1. Professional summary
2. Technical skills
3. Projects
4. Internship/work experience
5. Education
6. ATS keyword relevance
7. Action-oriented wording
8. Resume structure and clarity
9. Evidence of technical impact
10. Relevance to software/AI/ML roles

IMPROVEMENT STEPS:

Create 5-8 specific steps.

Each step must explain:
- what should be changed
- why it should be changed
- what the candidate should do

Do not give generic advice.

Example format:

[
    {{
        "step": 1,
        "title": "Improve Professional Summary",
        "problem": "Explain the actual weakness.",
        "action": "Explain exactly what the candidate should change.",
        "priority": "High"
    }}
]

RESUME:

{resume_text}
"""

    raw_text = ""

    try:

        response = client.models.generate_content(
            model="gemini-3.5-flash-lite",
            contents=prompt,
        )

        raw_text = response.text.strip()

        # Remove markdown if Gemini accidentally adds it
        if raw_text.startswith("```json"):
            raw_text = raw_text[7:]

        elif raw_text.startswith("```"):
            raw_text = raw_text[3:]

        if raw_text.endswith("```"):
            raw_text = raw_text[:-3]

        raw_text = raw_text.strip()

        result = json.loads(raw_text)

        # Make sure score is valid
        score = result.get("resume_score", 0)

        try:
            score = int(score)
        except (ValueError, TypeError):
            score = 0

        result["resume_score"] = max(0, min(100, score))

        # Make sure all fields exist
        result.setdefault("summary", "")
        result.setdefault("skills", [])
        result.setdefault("strengths", [])
        result.setdefault("weaknesses", [])
        result.setdefault("missing_skills", [])
        result.setdefault("suggestions", [])
        result.setdefault("improvement_steps", [])

        return result

    except json.JSONDecodeError:

        print("Invalid JSON returned by Gemini:")
        print(raw_text)

        return {
            "resume_score": 0,
            "summary": "The AI returned an invalid analysis format.",
            "skills": [],
            "strengths": [],
            "weaknesses": [],
            "missing_skills": [],
            "suggestions": [],
            "improvement_steps": [],
            "raw_response": raw_text,
        }

    except Exception as error:

        print("Resume analyzer error:", error)

        return {
            "resume_score": 0,
            "summary": "Resume analysis failed.",
            "skills": [],
            "strengths": [],
            "weaknesses": [],
            "missing_skills": [],
            "suggestions": [],
            "improvement_steps": [],
            "error": str(error),
        }
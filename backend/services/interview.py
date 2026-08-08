import os
import json

from google import genai
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise ValueError("GEMINI_API_KEY is missing from .env")

client = genai.Client(api_key=api_key)


def generate_interview_question(
    target_role: str,
    difficulty: str,
    resume_text: str = ""
) -> dict:

    prompt = f"""
You are an expert technical interviewer.

Generate ONE interview question for the candidate.

Target role:
{target_role}

Difficulty:
{difficulty}

Candidate resume:
{resume_text}

Return ONLY valid JSON.

Use exactly this structure:

{{
    "question": "",
    "category": "",
    "difficulty": "",
    "expected_topics": []
}}

Rules:
- Ask exactly ONE question.
- Make it relevant to the target role.
- If resume information is available, personalize the question.
- Do not provide the answer.
"""

    response = client.models.generate_content(
        model="gemini-3.5-flash-lite",
        contents=prompt,
    )

    raw = response.text.strip()

    if raw.startswith("```json"):
        raw = raw[7:]

    if raw.startswith("```"):
        raw = raw[3:]

    if raw.endswith("```"):
        raw = raw[:-3]

    return json.loads(raw.strip())


def evaluate_interview_answer(
    target_role: str,
    question: str,
    answer: str
) -> dict:

    prompt = f"""
You are an expert technical interviewer.

Evaluate the candidate's answer.

Target role:
{target_role}

Question:
{question}

Candidate answer:
{answer}

Return ONLY valid JSON.

Use exactly this structure:

{{
    "score": 0,
    "rating": "",
    "strengths": [],
    "weaknesses": [],
    "missing_points": [],
    "feedback": "",
    "better_answer": ""
}}

Scoring:
0-39 = Poor
40-59 = Needs Improvement
60-74 = Good
75-89 = Very Good
90-100 = Excellent

Evaluate:
- Technical correctness
- Relevance
- Completeness
- Clarity
- Practical understanding

Keep feedback constructive and useful.
"""

    response = client.models.generate_content(
        model="gemini-3.5-flash-lite",
        contents=prompt,
    )

    raw = response.text.strip()

    if raw.startswith("```json"):
        raw = raw[7:]

    if raw.startswith("```"):
        raw = raw[3:]

    if raw.endswith("```"):
        raw = raw[:-3]

    return json.loads(raw.strip())
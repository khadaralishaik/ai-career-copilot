from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from io import BytesIO
import os
import re
import json

import fitz

from dotenv import load_dotenv
from google import genai

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    HRFlowable,
)
from reportlab.lib.units import mm

from services.resume_analyzer import analyze_resume
from services.job_matcher import match_resume_to_job
from services.career_roadmap import generate_career_roadmap

from services.interview import (
    generate_interview_question,
    evaluate_interview_answer,
)


# =========================================================
# ENVIRONMENT / GEMINI
# =========================================================

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise ValueError("GEMINI_API_KEY is missing from .env")

client = genai.Client(api_key=api_key)


# =========================================================
# FASTAPI APP
# =========================================================

app = FastAPI(
    title="AI Career Copilot",
    version="1.0.0"
)


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# ROOT
# =========================================================

@app.get("/")
def root():
    return {
        "message": "AI Career Copilot Backend Connected Successfully"
    }


# =========================================================
# RESUME UPLOAD + ANALYSIS
# =========================================================

@app.post("/api/resume/upload")
async def upload_resume(
    file: UploadFile = File(...)
):

    if file.content_type != "application/pdf":
        return {
            "success": False,
            "message": "Currently only PDF resumes are supported."
        }

    try:

        file_content = await file.read()

        pdf = fitz.open(
            stream=file_content,
            filetype="pdf"
        )

        extracted_text = ""

        for page in pdf:
            extracted_text += page.get_text() + "\n"

        pdf.close()

        extracted_text = extracted_text.strip()

        if not extracted_text:
            return {
                "success": False,
                "message": "Could not extract text from this PDF."
            }

        # Analyze original resume
        analysis = analyze_resume(extracted_text)

        return {
            "success": True,
            "filename": file.filename,
            "message": "Resume analyzed successfully.",
            "resume_text": extracted_text,
            "analysis": analysis
        }

    except Exception as error:

        print("Resume analysis error:", error)

        return {
            "success": False,
            "message": f"Failed to analyze resume: {str(error)}"
        }


# =========================================================
# RESUME IMPROVEMENT REQUEST
# =========================================================

class ResumeImproveRequest(BaseModel):
    resume_text: str


# =========================================================
# IMPROVE RESUME
# =========================================================

@app.post("/api/resume/improve")
async def improve_resume(
    request: ResumeImproveRequest
):

    original_resume = request.resume_text.strip()

    if not original_resume:
        return {
            "success": False,
            "message": "Resume text is required."
        }

    try:

        # -------------------------------------------------
        # STEP 1: GET ORIGINAL SCORE
        # -------------------------------------------------

        original_analysis = analyze_resume(
            original_resume
        )

        original_score = int(
            original_analysis.get(
                "resume_score",
                0
            )
        )

        # -------------------------------------------------
        # STEP 2: ASK AI TO ACTUALLY REWRITE RESUME
        # -------------------------------------------------

        prompt = f"""
You are an expert technical recruiter, ATS resume writer,
and professional career coach.

Your job is to REWRITE the candidate's actual resume.

Do NOT return a template.

Do NOT return instructions.

Do NOT explain how to improve the resume.

Do NOT return placeholders.

Return the COMPLETE rewritten resume.

The output must be directly usable as a real job application resume.

IMPORTANT TRUTHFULNESS RULES:

1. Preserve the candidate's real name.
2. Preserve the candidate's actual contact information.
3. Preserve the candidate's actual education.
4. Preserve the candidate's actual internships and work experience.
5. Preserve the candidate's actual projects.
6. Preserve the candidate's actual technologies and skills.
7. Preserve actual certifications only.
8. Never invent a company.
9. Never invent an internship.
10. Never invent a job.
11. Never invent a degree.
12. Never invent a certification.
13. Never invent a technology.
14. Never invent an achievement.
15. Never invent a number or metric.
16. Never invent percentages.
17. Never invent job responsibilities.
18. Never invent GitHub or LinkedIn URLs.
19. Never create fake information just to improve ATS score.

IMPROVE THE RESUME BY:

- Rewriting weak sentences professionally.
- Using strong action verbs.
- Removing unnecessary words.
- Making bullet points concise.
- Improving ATS keyword placement.
- Improving technical terminology.
- Improving section organization.
- Improving professional summary.
- Improving project descriptions.
- Improving experience descriptions.
- Improving skills organization.
- Removing repetition.
- Removing generic statements.
- Making the resume easier for recruiters to scan.
- Making the resume ATS-friendly.
- Keeping all information truthful.

IMPORTANT:

If the original resume does not contain a metric,
DO NOT create a metric.

If the original resume says something vaguely,
rewrite it professionally without adding new facts.

If the original resume contains a placeholder such as
"[Insert Link]", remove the placeholder rather than inventing
a URL.

OUTPUT FORMAT:

Return ONLY valid JSON.

Do not use markdown.

Do not use ```json.

Use exactly this structure:

{{
    "improved_resume": "COMPLETE REWRITTEN RESUME HERE",
    "changes": [
        "Change made to the resume",
        "Change made to the resume",
        "Change made to the resume",
        "Change made to the resume",
        "Change made to the resume"
    ]
}}

ORIGINAL RESUME:

{original_resume}
"""

        response = client.models.generate_content(
            model="gemini-3.5-flash",
            contents=prompt
        )

        raw_result = response.text.strip()

        # -------------------------------------------------
        # STEP 3: CLEAN AI RESPONSE
        # -------------------------------------------------

        raw_result = raw_result.replace(
            "```json",
            ""
        )

        raw_result = raw_result.replace(
            "```",
            ""
        )

        raw_result = raw_result.strip()

        # Sometimes AI can accidentally return text before JSON.
        # Try to isolate the JSON object.
        json_start = raw_result.find("{")
        json_end = raw_result.rfind("}")

        if json_start != -1 and json_end != -1:
            raw_result = raw_result[
                json_start:json_end + 1
            ]

        try:

            parsed_result = json.loads(
                raw_result
            )

            improved_resume = parsed_result.get(
                "improved_resume",
                ""
            )

            changes = parsed_result.get(
                "changes",
                []
            )

        except json.JSONDecodeError:

            print(
                "AI JSON parsing failed."
            )

            # Fallback: use the raw AI output
            improved_resume = raw_result
            changes = [
                "AI improved the resume wording and structure."
            ]

        improved_resume = improved_resume.strip()

        if not improved_resume:

            return {
                "success": False,
                "message": "AI did not return an improved resume."
            }

        # -------------------------------------------------
        # STEP 4: RE-ANALYZE THE ACTUAL IMPROVED RESUME
        # -------------------------------------------------

        improved_analysis = analyze_resume(
            improved_resume
        )

        improved_score = int(
            improved_analysis.get(
                "resume_score",
                0
            )
        )

        # -------------------------------------------------
        # STEP 5: RETURN EVERYTHING
        # -------------------------------------------------

        return {
            "success": True,
            "message": "Resume improved successfully.",

            "original_score": original_score,

            "improved_score": improved_score,

            "score_change": improved_score - original_score,

            "improved_resume": improved_resume,

            "changes": changes,

            "analysis": improved_analysis
        }

    except Exception as error:

        print(
            "Resume improvement error:",
            error
        )

        return {
            "success": False,
            "message": f"Failed to improve resume: {str(error)}"
        }


# =========================================================
# PDF REQUEST
# =========================================================

class ResumePDFRequest(BaseModel):
    resume_text: str


# =========================================================
# PDF HELPERS
# =========================================================

def clean_resume_line(line: str) -> str:

    line = line.strip()

    # Remove markdown formatting
    line = line.replace("**", "")
    line = line.replace("__", "")

    # Remove markdown heading markers
    line = re.sub(
        r"^#{1,6}\s*",
        "",
        line
    )

    return line.strip()


def escape_pdf_text(text: str) -> str:

    text = text.replace(
        "&",
        "&amp;"
    )

    text = text.replace(
        "<",
        "&lt;"
    )

    text = text.replace(
        ">",
        "&gt;"
    )

    return text


# =========================================================
# GENERATE PROFESSIONAL PDF
# =========================================================

@app.post("/api/resume/download-pdf")
async def download_resume_pdf(
    request: ResumePDFRequest
):

    resume_text = request.resume_text.strip()

    if not resume_text:
        return {
            "success": False,
            "message": "Improved resume text is required."
        }

    try:

        pdf_buffer = BytesIO()

        document = SimpleDocTemplate(
            pdf_buffer,
            pagesize=A4,
            rightMargin=16 * mm,
            leftMargin=16 * mm,
            topMargin=14 * mm,
            bottomMargin=14 * mm,
            title="AI Improved Resume",
            author="AI Career Copilot"
        )

        styles = getSampleStyleSheet()

        name_style = ParagraphStyle(
            "ResumeName",
            parent=styles["Title"],
            fontName="Helvetica-Bold",
            fontSize=18,
            leading=22,
            alignment=TA_CENTER,
            spaceAfter=5,
        )

        contact_style = ParagraphStyle(
            "Contact",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=8.5,
            leading=11,
            alignment=TA_CENTER,
            spaceAfter=8,
        )

        heading_style = ParagraphStyle(
            "SectionHeading",
            parent=styles["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=10.5,
            leading=13,
            spaceBefore=8,
            spaceAfter=4,
        )

        body_style = ParagraphStyle(
            "Body",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=8.8,
            leading=11.5,
            spaceAfter=3,
        )

        bullet_style = ParagraphStyle(
            "Bullet",
            parent=body_style,
            leftIndent=10,
            firstLineIndent=-7,
            spaceAfter=2,
        )

        story = []

        lines = resume_text.splitlines()

        section_names = {
            "SUMMARY",
            "PROFESSIONAL SUMMARY",
            "OBJECTIVE",
            "CAREER OBJECTIVE",
            "SKILLS",
            "TECHNICAL SKILLS",
            "TECHNOLOGIES",
            "EXPERIENCE",
            "WORK EXPERIENCE",
            "PROFESSIONAL EXPERIENCE",
            "INTERNSHIP",
            "INTERNSHIPS",
            "PROJECTS",
            "ACADEMIC PROJECTS",
            "EDUCATION",
            "CERTIFICATIONS",
            "ACHIEVEMENTS",
            "AWARDS",
            "COURSEWORK",
            "LANGUAGES",
            "INTERESTS",
            "ACTIVITIES",
        }

        first_line = True
        contact_line_found = False

        for raw_line in lines:

            line = clean_resume_line(
                raw_line
            )

            if not line:
                story.append(
                    Spacer(1, 2)
                )
                continue

            escaped = escape_pdf_text(
                line
            )

            # -----------------------------------------
            # NAME
            # -----------------------------------------

            if first_line:

                story.append(
                    Paragraph(
                        escaped,
                        name_style
                    )
                )

                first_line = False

                continue

            # -----------------------------------------
            # CONTACT INFORMATION
            # -----------------------------------------

            lower_line = line.lower()

            if (
                not contact_line_found
                and (
                    "@" in line
                    or "linkedin" in lower_line
                    or "github" in lower_line
                    or "phone" in lower_line
                )
            ):

                story.append(
                    Paragraph(
                        escaped,
                        contact_style
                    )
                )

                contact_line_found = True

                continue

            # -----------------------------------------
            # SECTION HEADING
            # -----------------------------------------

            normalized = re.sub(
                r"[:\-]+$",
                "",
                line.upper()
            ).strip()

            if normalized in section_names:

                story.append(
                    Paragraph(
                        escape_pdf_text(
                            normalized
                        ),
                        heading_style
                    )
                )

                story.append(
                    HRFlowable(
                        width="100%",
                        thickness=0.5,
                        spaceBefore=0,
                        spaceAfter=4,
                    )
                )

                continue

            # -----------------------------------------
            # BULLET
            # -----------------------------------------

            if (
                line.startswith("- ")
                or line.startswith("• ")
                or line.startswith("* ")
            ):

                bullet_text = line[2:].strip()

                story.append(
                    Paragraph(
                        "• "
                        + escape_pdf_text(
                            bullet_text
                        ),
                        bullet_style
                    )
                )

                continue

            # -----------------------------------------
            # NORMAL TEXT
            # -----------------------------------------

            story.append(
                Paragraph(
                    escaped,
                    body_style
                )
            )

        document.build(story)

        pdf_buffer.seek(0)

        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition":
                    'attachment; filename="AI_Improved_Resume.pdf"'
            }
        )

    except Exception as error:

        print(
            "PDF generation error:",
            error
        )

        return {
            "success": False,
            "message": f"Failed to generate PDF: {str(error)}"
        }


# =========================================================
# JOB MATCHER
# =========================================================

class JobMatchRequest(BaseModel):
    resume_text: str
    job_description: str


@app.post("/api/job-match")
async def job_match(
    request: JobMatchRequest
):

    if not request.resume_text.strip():
        return {
            "success": False,
            "message": "Resume text is required."
        }

    if not request.job_description.strip():
        return {
            "success": False,
            "message": "Job description is required."
        }

    try:

        result = match_resume_to_job(
            request.resume_text,
            request.job_description
        )

        return {
            "success": True,
            "message": "Job match analysis completed.",
            "analysis": result
        }

    except Exception as error:

        print(
            "Job matching error:",
            error
        )

        return {
            "success": False,
            "message": f"Failed to analyze job match: {str(error)}"
        }


# =========================================================
# CAREER ROADMAP
# =========================================================

class CareerRoadmapRequest(BaseModel):
    resume_text: str
    target_role: str
    job_description: str = ""


@app.post("/api/career-roadmap")
async def career_roadmap(
    request: CareerRoadmapRequest
):

    if not request.resume_text.strip():
        return {
            "success": False,
            "message": "Resume text is required."
        }

    if not request.target_role.strip():
        return {
            "success": False,
            "message": "Target role is required."
        }

    try:

        result = generate_career_roadmap(
            request.resume_text,
            request.target_role,
            request.job_description
        )

        return {
            "success": True,
            "message": "Career roadmap generated successfully.",
            "roadmap": result
        }

    except Exception as error:

        print(
            "Career roadmap error:",
            error
        )

        return {
            "success": False,
            "message": f"Failed to generate roadmap: {str(error)}"
        }


# =========================================================
# INTERVIEW
# =========================================================

class InterviewQuestionRequest(BaseModel):
    target_role: str
    difficulty: str
    resume_text: str = ""


class InterviewEvaluationRequest(BaseModel):
    target_role: str
    question: str
    answer: str


@app.post("/api/interview/question")
async def interview_question(
    request: InterviewQuestionRequest
):

    if not request.target_role.strip():
        return {
            "success": False,
            "message": "Target role is required."
        }

    try:

        result = generate_interview_question(
            request.target_role,
            request.difficulty,
            request.resume_text
        )

        return {
            "success": True,
            "question": result
        }

    except Exception as error:

        print(
            "Interview question error:",
            error
        )

        return {
            "success": False,
            "message": str(error)
        }


@app.post("/api/interview/evaluate")
async def interview_evaluate(
    request: InterviewEvaluationRequest
):

    if not request.answer.strip():
        return {
            "success": False,
            "message": "Answer is required."
        }

    try:

        result = evaluate_interview_answer(
            request.target_role,
            request.question,
            request.answer
        )

        return {
            "success": True,
            "evaluation": result
        }

    except Exception as error:

        print(
            "Interview evaluation error:",
            error
        )

        return {
            "success": False,
            "message": str(error)
        }
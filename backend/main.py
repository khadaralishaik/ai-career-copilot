from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import fitz

from services.resume_analyzer import analyze_resume
from pydantic import BaseModel

from services.job_matcher import match_resume_to_job
from services.career_roadmap import generate_career_roadmap

from services.interview import (
    generate_interview_question,
    evaluate_interview_answer,
)

app = FastAPI(title="AI Career Copilot")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "message": "AI Career Copilot Backend Connected Successfully"
    }


@app.post("/api/resume/upload")
async def upload_resume(file: UploadFile = File(...)):

    if file.content_type != "application/pdf":
        return {
            "success": False,
            "message": "Currently only PDF resumes are supported."
        }

    file_content = await file.read()

    try:
        pdf = fitz.open(
            stream=file_content,
            filetype="pdf"
        )

        extracted_text = ""

        for page in pdf:
            extracted_text += page.get_text()

        pdf.close()

        extracted_text = extracted_text.strip()

        if not extracted_text:
            return {
                "success": False,
                "message": "Could not extract text from this PDF."
            }

        analysis = analyze_resume(extracted_text)

        return {
            "success": True,
            "filename": file.filename,
            "message": "Resume analyzed successfully.",
            "analysis": analysis
        }

    except Exception as error:
        print("Resume analysis error:", error)

        return {
            "success": False,
            "message": f"Failed to analyze resume: {str(error)}"
        }
class JobMatchRequest(BaseModel):
    resume_text: str
    job_description: str


@app.post("/api/job-match")
async def job_match(request: JobMatchRequest):

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

        print("Job matching error:", error)

        return {
            "success": False,
            "message": f"Failed to analyze job match: {str(error)}"
        }
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

        print("Career roadmap error:", error)

        return {
            "success": False,
            "message": f"Failed to generate roadmap: {str(error)}"
        }
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

        print("Interview question error:", error)

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

        print("Interview evaluation error:", error)

        return {
            "success": False,
            "message": str(error)
        }    
from discovery import Job, score_job


def test_score_matches_skills_and_title():
    job = Job("Python Backend Engineer", "Example", "Remote", "https://example.com/job", "test", "Build APIs with Python FastAPI and PostgreSQL")
    score = score_job(job, {"skills": ["Python", "FastAPI", "React"], "target_titles": ["Backend Engineer"], "remote_ok": True})
    assert score >= 70


def test_score_penalizes_non_target_location():
    job = Job("Software Engineer", "Example", "New York", "https://example.com/job", "test", "Java")
    score = score_job(job, {"skills": ["Python"], "target_titles": ["Data Scientist"], "target_locations": ["Hyderabad"], "remote_ok": False})
    assert score == 0

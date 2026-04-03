# Pydantic models for request/response validation
from pydantic import BaseModel

class HintRequest(BaseModel):
    user_id: str
    problem_id: str
    problem_slug: str

class HintResponse(BaseModel):
    hint: str
    hints_used: int

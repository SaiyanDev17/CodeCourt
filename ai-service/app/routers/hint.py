# Hint endpoint router
from fastapi import APIRouter

router = APIRouter(prefix="/hint", tags=["hint"])

@router.post("/")
async def generate_hint():
    """Generate AI hint for a problem"""
    return {"message": "Hint generation endpoint"}

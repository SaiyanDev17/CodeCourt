# FastAPI application entry point
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import hint  # Import the hint router


app = FastAPI(title="CodeCourt AI Service", version="1.0.0")

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the hint router
# This mounts all routes from hint.py at the /hint prefix
# POST /hint endpoint is now available
app.include_router(hint.router)

@app.get("/")
async def root():
    return {"message": "CodeCourt AI Service"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

# ============================================================================
# Pydantic Models for AI Service Request/Response Validation
# ============================================================================
#
# WHAT IS PYDANTIC?
# Pydantic is a Python library that validates data at RUNTIME using type hints.
# Think of it like Zod for TypeScript, but built into Python's type system.
#
# COMPARISON TO TYPESCRIPT/ZOD:
# ┌─────────────────────┬──────────────────┬─────────────────┬──────────────────┐
# │ Feature             │ TS Interfaces    │ Zod (TS)        │ Pydantic (Py)    │
# ├─────────────────────┼──────────────────┼─────────────────┼──────────────────┤
# │ Type checking       │ Compile-time     │ Runtime         │ Runtime          │
# │ Validation          │ None             │ Full validation │ Full validation  │
# │ Parsing/Coercion    │ None             │ Yes             │ Yes              │
# │ Error messages      │ IDE only         │ Detailed        │ Detailed         │
# │ Auto API docs       │ No               │ No              │ Yes (FastAPI)    │
# └─────────────────────┴──────────────────┴─────────────────┴──────────────────┘
#
# WHY WE NEED THIS:
# TypeScript interfaces disappear after compilation—they don't exist at runtime!
# When our Next.js frontend sends JSON to this FastAPI service, we need to:
# 1. Validate the JSON structure (is user_id present? is it a string?)
# 2. Parse the JSON into Python objects
# 3. Return helpful error messages if validation fails
#
# HOW FASTAPI USES THESE MODELS:
# When you write:
#   @app.post("/hint")
#   async def get_hint(request: HintRequest):
#       ...
#
# FastAPI automatically:
# 1. Reads the incoming JSON body from the HTTP request
# 2. Validates it against the HintRequest schema
# 3. Converts the JSON into a HintRequest Python object
# 4. Returns a 422 Unprocessable Entity error if validation fails
# 5. Passes the validated object to your function
#
# This means you NEVER have to write manual validation code like:
#   if 'user_id' not in data or not isinstance(data['user_id'], str):
#       return {"error": "Invalid user_id"}
#
# Pydantic + FastAPI handle all of that automatically!
# ============================================================================

from pydantic import BaseModel, Field

# ============================================================================
# WHAT IS BaseModel?
# ============================================================================
# BaseModel is the parent class from Pydantic that gives your classes
# "superpowers" for data validation and parsing.
#
# When you inherit from BaseModel, your class automatically gets:
# - Validation: Checks that all fields match their type hints
# - Parsing: Converts JSON/dict into Python objects
# - Serialization: Converts Python objects back to JSON/dict
# - Type coercion: Automatically converts compatible types (e.g., "123" → 123)
# - Error messages: Detailed validation errors with field names and reasons
#
# Example:
#   request = HintRequest(user_id="abc", problem_id="123", problem_slug="two-sum")
#   # ✅ Works! All fields are strings as expected
#
#   request = HintRequest(user_id=999, problem_id="123")
#   # ❌ Fails! user_id should be string, and problem_slug is missing
#   # Pydantic raises ValidationError with detailed message
# ============================================================================


class HintRequest(BaseModel):
    """
    Request model for POST /hint endpoint.
    
    This model represents the JSON data that our Next.js frontend sends
    when a contestant requests an AI hint for a problem.
    
    EXAMPLE REQUEST FROM FRONTEND:
    POST http://localhost:8000/hint
    Content-Type: application/json
    
    {
        "user_id": "507f1f77bcf86cd799439011",
        "problem_id": "507f191e810c19729de860ea",
        "problem_slug": "two-sum"
    }
    
    FASTAPI AUTOMATIC VALIDATION:
    - If user_id is missing → 422 error: "field required"
    - If user_id is not a string → 422 error: "str type expected"
    - If problem_slug is an empty string → 422 error (due to min_length=1)
    
    FIELDS EXPLAINED:
    - user_id: MongoDB ObjectId as string (identifies the contestant)
    - problem_id: MongoDB ObjectId as string (identifies the problem)
    - problem_slug: URL-safe problem identifier (e.g., "two-sum", "binary-search")
    
    WHY WE NEED ALL THREE FIELDS:
    - user_id + problem_id: Used to check hint count and save hint to database
    - problem_slug: Used to fetch problem metadata from Express API
    """
    
    # Field() allows us to add validation rules and documentation
    # - description: Shows up in FastAPI's auto-generated Swagger docs
    # - min_length: Ensures the string is not empty
    # - example: Shows up in Swagger UI as sample data
    
    user_id: str = Field(
        ...,  # The "..." means this field is REQUIRED (not optional)
        description="MongoDB ObjectId of the user requesting the hint",
        min_length=1,  # Must be at least 1 character (not empty string)
        example="507f1f77bcf86cd799439011"
    )
    
    problem_id: str = Field(
        ...,  # Required field
        description="MongoDB ObjectId of the problem",
        min_length=1,
        example="507f191e810c19729de860ea"
    )
    
    problem_slug: str = Field(
        ...,  # Required field
        description="URL-safe slug identifier for the problem (e.g., 'two-sum')",
        min_length=1,
        example="two-sum"
    )
    
    # PYDANTIC CONFIG (optional but useful)
    class Config:
        # This makes the model immutable after creation (like TypeScript readonly)
        # Once you create a HintRequest, you can't change its fields
        # This prevents bugs where you accidentally modify request data
        frozen = False  # Set to True if you want immutability
        
        # This provides example data for FastAPI's Swagger UI documentation
        schema_extra = {
            "example": {
                "user_id": "507f1f77bcf86cd799439011",
                "problem_id": "507f191e810c19729de860ea",
                "problem_slug": "two-sum"
            }
        }


class HintResponse(BaseModel):
    """
    Response model for POST /hint endpoint.
    
    This model represents the JSON data that our FastAPI service returns
    to the Next.js frontend after the AI agent generates a hint.
    
    EXAMPLE RESPONSE TO FRONTEND:
    HTTP/1.1 200 OK
    Content-Type: application/json
    
    {
        "hint": "Consider using a hash map to store numbers you've seen...",
        "hints_used": 2
    }
    
    FASTAPI AUTOMATIC SERIALIZATION:
    When your endpoint returns a HintResponse object, FastAPI automatically:
    1. Converts the Python object to JSON
    2. Sets the correct Content-Type header
    3. Validates that the response matches this schema
    4. Returns a 500 error if your code returns invalid data
    
    FIELDS EXPLAINED:
    - hint: The AI-generated hint text (no full solution, no code)
    - hints_used: Total number of hints used for this (user, problem) pair
    
    WHY hints_used IS IMPORTANT:
    The frontend displays "Hints remaining: X/3" to the user.
    After 3 hints, the frontend disables the "Get Hint" button.
    """
    
    hint: str = Field(
        ...,  # Required field
        description="AI-generated hint text (guidance without full solution)",
        min_length=1,  # Hint cannot be empty
        example="Consider using a hash map to store numbers you've already seen. This allows O(1) lookup time."
    )
    
    hints_used: int = Field(
        ...,  # Required field
        description="Total number of hints used by this user for this problem (max 3)",
        ge=1,  # ge = "greater than or equal to" — must be at least 1
        le=3,  # le = "less than or equal to" — cannot exceed 3
        example=2
    )
    
    # PYDANTIC CONFIG
    class Config:
        schema_extra = {
            "example": {
                "hint": "Think about the time complexity of your current approach. Can you reduce it by storing intermediate results?",
                "hints_used": 2
            }
        }


# ============================================================================
# HOW THIS INTEGRATES WITH THE REST OF THE SYSTEM
# ============================================================================
#
# DATA FLOW:
# 1. User clicks "Get Hint" button in Next.js frontend
# 2. Frontend sends POST request to http://localhost:8000/hint with JSON body
# 3. FastAPI receives request and validates against HintRequest schema
# 4. If validation passes, FastAPI calls our hint endpoint function
# 5. Our LangChain agent generates a hint (see app/agent/executor.py)
# 6. We create a HintResponse object with the hint and count
# 7. FastAPI serializes HintResponse to JSON and sends to frontend
# 8. Frontend displays hint and updates "Hints remaining" counter
#
# ERROR HANDLING:
# - If frontend sends invalid JSON → FastAPI returns 422 with detailed errors
# - If hint count is already 3 → Our agent returns 403 (handled in executor.py)
# - If Groq API fails → Our agent returns 502 (handled in executor.py)
#
# COMPARISON TO EXPRESS/TYPESCRIPT:
# In Express.js, you would need to manually validate like this:
#
#   app.post('/hint', (req, res) => {
#     if (!req.body.user_id || typeof req.body.user_id !== 'string') {
#       return res.status(422).json({ error: 'Invalid user_id' });
#     }
#     // ... repeat for every field ...
#   });
#
# With Pydantic + FastAPI, all that validation is automatic!
# ============================================================================

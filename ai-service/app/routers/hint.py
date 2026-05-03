# ============================================================================
# Hint Router - POST /hint Endpoint
# ============================================================================
# This file defines the FastAPI router for the AI hint generation endpoint.
# It's the entry point for the Next.js frontend to request hints.
#
# COMPARISON TO EXPRESS.JS (Node.js):
# -----------------------------------
# In Express, you would create a router like this:
#
#   const express = require('express');
#   const router = express.Router();
#   
#   router.post('/hint', async (req, res) => {
#     try {
#       const { user_id, problem_id, problem_slug } = req.body;
#       
#       // Validate request body manually
#       if (!user_id || !problem_id || !problem_slug) {
#         return res.status(422).json({ error: 'Missing required fields' });
#       }
#       
#       // Run the agent
#       const result = await agentExecutor.invoke({ input: "..." });
#       
#       // Return response
#       return res.json({ hint: result.output, hints_used: 2 });
#     } catch (error) {
#       return res.status(500).json({ error: error.message });
#     }
#   });
#   
#   module.exports = router;
#
# WITH FASTAPI (Python):
# ----------------------
# FastAPI handles validation, serialization, and error handling automatically:
#
#   from fastapi import APIRouter
#   
#   router = APIRouter(prefix="/hint", tags=["hint"])
#   
#   @router.post("/", response_model=HintResponse)
#   async def generate_hint(request: HintRequest):
#     # FastAPI automatically:
#     # - Validates the request body against HintRequest schema
#     # - Returns 422 if validation fails
#     # - Converts JSON to HintRequest object
#     # - Passes the validated object to this function
#     
#     result = await agent_executor.ainvoke({"input": "..."})
#     return HintResponse(hint=result["output"], hints_used=2)
#
# KEY BENEFITS OF FASTAPI:
# -------------------------
# 1. No manual validation: Pydantic handles it automatically
# 2. Type safety: Your IDE knows the types of all fields
# 3. Auto-generated docs: Swagger UI is created automatically
# 4. Async support: Native async/await (like Express with async handlers)
# 5. Error handling: FastAPI catches validation errors and returns 422
# ============================================================================

# ============================================================================
# IMPORTS
# ============================================================================
# APIRouter: FastAPI's equivalent to express.Router()
# HTTPException: Used to return HTTP error responses (like res.status(403).json())
# HintRequest: Pydantic model that validates the incoming JSON request body
# HintResponse: Pydantic model that validates the outgoing JSON response
# create_agent_executor: Factory function that creates our LangChain agent
# ============================================================================
import json

import httpx
from fastapi import APIRouter, HTTPException
from app.models.schemas import HintRequest, HintResponse
from app.config import settings


# ============================================================================
# CREATE THE ROUTER
# ============================================================================
# APIRouter is FastAPI's way of organizing routes into separate modules.
# It's equivalent to express.Router() in Node.js.
#
# EXPRESS.JS EQUIVALENT:
# ----------------------
# const router = express.Router();
#
# FASTAPI PARAMETERS:
# -------------------
# - prefix: All routes in this router will be prefixed with "/hint"
#   * Example: @router.post("/") becomes POST /hint
#   * Example: @router.get("/count") becomes GET /hint/count
#
# - tags: Used for grouping routes in the auto-generated Swagger docs
#   * All routes in this router will be under the "Hints" section
#   * Makes the API documentation easier to navigate
#
# HOW TO MOUNT THIS ROUTER IN main.py:
# -------------------------------------
# from app.routers import hint
# app.include_router(hint.router)
#
# This is equivalent to Express:
# const hintRouter = require('./routers/hint');
# app.use(hintRouter);
# ============================================================================
router = APIRouter(
    prefix="/hint",  # All routes will be prefixed with /hint
    tags=["Hints"]   # Swagger UI will group these under "Hints" section
)


def _format_json_block(value: dict) -> str:
    return json.dumps(value, indent=2, ensure_ascii=False, default=str)


def _build_hint_prompt(
    *,
    hint_index: int,
    problem: dict,
    submission_history: dict,
    previous_hints: list[dict],
) -> str:
    elaboration_rules = {
        1: (
            "This is Hint 1. Be high-level and conceptual: 1-2 short paragraphs. "
            "Use guiding questions and point toward the key observation without naming the final algorithm directly."
        ),
        2: (
            "This is Hint 2. Be more elaborate than Hint 1: 2-4 short paragraphs. "
            "Narrow the approach, discuss useful state/invariants or edge cases, and mention complexity pressure."
        ),
        3: (
            "This is Hint 3. Be the most elaborate hint: give a concrete strategy and, if helpful, "
            "at most 3 lines of pseudocode. Still do not provide a complete solution or copy-pasteable code."
        ),
    }

    return f"""You are CodeCourt's competitive-programming mentor. Generate exactly one hint for the current request.

The hint must be specific to the MongoDB problem details below and must not repeat previous hints.

Question details from MongoDB:
- Title: {problem.get("title")}
- Slug: {problem.get("slug")}
- Difficulty: {problem.get("difficulty")}
- Time limit: {problem.get("timeLimit")} ms
- Memory limit: {problem.get("memoryLimit")} MB
- Description:
{problem.get("description")}
- Constraints:
{problem.get("constraints")}
- Sample test cases:
{_format_json_block({"sampleTestCases": problem.get("sampleTestCases", [])})}
- Other available problem metadata:
{_format_json_block({key: value for key, value in problem.items() if key not in {"title", "slug", "difficulty", "timeLimit", "memoryLimit", "description", "constraints", "sampleTestCases", "hiddenTestCasesS3Key", "authorId"}})}

User context:
- This request is for Hint {hint_index} of 3.
- Previous hints already shown:
{_format_json_block({"previousHints": previous_hints})}
- Submission history:
{_format_json_block(submission_history)}

Progression rule:
{elaboration_rules[hint_index]}

Quality rules:
- All three hints for a problem must be different and increasingly elaborate.
- Use the title, description, constraints, sample cases, time/memory limits, and submission history when relevant.
- If submissions show WA, focus on edge cases or logic gaps. If TLE, focus on efficiency. If RE/CE, focus on boundaries or language/runtime issues.
- Do not reveal the full solution, full algorithm implementation, or complete code.
- Do not include "Hint {hint_index}" in the answer; the UI displays the number.
- Return only the hint text."""


async def _backend_get(client: httpx.AsyncClient, path: str, params: dict | None = None) -> dict:
    response = await client.get(f"{settings.EXPRESS_API_URL}{path}", params=params)
    response.raise_for_status()
    return response.json()


async def _backend_post(client: httpx.AsyncClient, path: str, payload: dict) -> dict:
    response = await client.post(f"{settings.EXPRESS_API_URL}{path}", json=payload)
    response.raise_for_status()
    return response.json()


async def _generate_hint_with_llm(prompt: str) -> str:
    from langchain_groq import ChatGroq

    llm = ChatGroq(
        model="llama-3.3-70b-versatile",
        api_key=settings.GROQ_API_KEY,
        temperature=0.65,
    )
    result = await llm.ainvoke(prompt)
    return result.content.strip()


def _latest_submission_focus(submission_history: dict) -> str:
    submissions = submission_history.get("submissions", [])
    if not submissions:
        return "No previous submissions were found, so start by matching the sample cases carefully."

    latest = submissions[0]
    verdict = latest.get("verdict")
    if verdict == "WA":
        return "Your latest submission was Wrong Answer, so pay close attention to edge cases and whether your logic handles every valid input shape."
    if verdict == "TLE":
        return "Your latest submission timed out, so the main issue is likely the growth rate of your approach under the stated constraints."
    if verdict == "MLE":
        return "Your latest submission used too much memory, so look for a way to keep only the information needed for the next decision."
    if verdict == "RE":
        return "Your latest submission had a runtime error, so check boundary conditions, empty/short inputs, indexing, and assumptions about parsed input."
    if verdict == "CE":
        return "Your latest submission had a compilation error, so first make sure the function signature, includes/imports, and returned type match the judge template."
    if verdict == "AC":
        return "You already have an accepted submission recorded; use this hint to understand the reasoning, not just the code."
    return "Use your latest submission result to decide whether the next improvement should target correctness, performance, or implementation details."


def _generate_fallback_hint(
    *,
    hint_index: int,
    problem: dict,
    submission_history: dict,
    previous_hints: list[dict],
) -> str:
    title = problem.get("title") or "this problem"
    constraints = (problem.get("constraints") or "").strip()
    samples = problem.get("sampleTestCases") or []
    first_sample = samples[0] if samples else {}
    focus = _latest_submission_focus(submission_history)

    if hint_index == 1:
        sample_note = ""
        if first_sample:
            sample_note = (
                f" In the first sample, compare the input and output and ask what relationship the output is proving, "
                f"not just what values appear there."
            )
        return (
            f"Think about the core observation in {title}: what information do you need to remember while scanning or "
            f"processing the input, and what can be safely ignored? {focus}{sample_note}"
        )

    if hint_index == 2:
        constraint_note = (
            f" The constraints are important here: {constraints} "
            if constraints
            else " The constraints are important here: estimate whether a nested or repeated scan would still fit. "
        )
        return (
            f"Narrow the problem down to the decision you make for each element or state. Before doing expensive work, "
            f"ask whether an earlier value/state can answer the current question faster if you store a compact summary of it."
            f"{constraint_note}{focus} Make sure duplicate values, smallest valid input sizes, and negative/large values "
            f"are handled according to the statement."
        )

    previous_summary = ""
    if previous_hints:
        previous_summary = " Build on the earlier hints by turning the remembered information into a direct lookup/check."
    return (
        f"Concrete strategy for {title}: process the input in one clear direction, keep a small structure containing only "
        f"the useful facts from positions/states you have already passed, and before adding the current item, check whether "
        f"that stored information completes the required condition.{previous_summary}\n"
        f"Pseudocode sketch:\n"
        f"for each item/state: check whether its needed partner/info was seen\n"
        f"if found, form the required answer\n"
        f"otherwise record the current item/state for later"
    )


# ============================================================================
# POST /hint ENDPOINT
# ============================================================================
# This is the main endpoint that the Next.js frontend calls to get AI hints.
#
# EXPRESS.JS EQUIVALENT:
# ----------------------
# router.post('/hint', async (req, res) => {
#   try {
#     const { user_id, problem_id, problem_slug } = req.body;
#     
#     // Manual validation
#     if (!user_id || !problem_id || !problem_slug) {
#       return res.status(422).json({ error: 'Missing required fields' });
#     }
#     
#     // Run the agent
#     const result = await agentExecutor.invoke({
#       input: `User ${user_id} needs a hint for problem ${problem_slug} (ID: ${problem_id})`
#     });
#     
#     // Extract hint from result
#     const hint = result.output;
#     
#     // Get hint count from database (would need to call Express API)
#     const hintsUsed = await getHintCount(user_id, problem_id);
#     
#     // Return response
#     return res.json({ hint, hints_used: hintsUsed });
#   } catch (error) {
#     console.error('Error generating hint:', error);
#     return res.status(500).json({ error: 'Failed to generate hint' });
#   }
# });
#
# FASTAPI DIFFERENCES:
# --------------------
# 1. No manual validation: FastAPI validates against HintRequest automatically
# 2. Type hints: request: HintRequest tells FastAPI to validate the body
# 3. response_model: HintResponse tells FastAPI to validate the response
# 4. Automatic docs: Swagger UI is generated from the type hints
# 5. Error handling: FastAPI catches exceptions and returns proper HTTP errors
#
# DECORATOR PARAMETERS:
# ---------------------
# @router.post("/")
# - "/" means this route is at the router's prefix (POST /hint)
# - If we used @router.post("/count"), it would be POST /hint/count
#
# response_model=HintResponse
# - Tells FastAPI to validate the response against HintResponse schema
# - Automatically converts the return value to JSON
# - Returns 500 if the response doesn't match the schema
# - Generates accurate Swagger docs showing the response structure
#
# status_code=200
# - The HTTP status code to return on success
# - Default is 200, but we specify it explicitly for clarity
# - FastAPI will return this status code if no exception is raised
#
# FUNCTION PARAMETERS:
# --------------------
# request: HintRequest
# - FastAPI automatically:
#   1. Reads the JSON body from the HTTP request
#   2. Validates it against the HintRequest schema
#   3. Returns 422 if validation fails (with detailed error messages)
#   4. Converts the JSON to a HintRequest Python object
#   5. Passes the validated object to this function
#
# This is equivalent to Express middleware like express-validator or Joi:
#   router.post('/hint',
#     body('user_id').isString().notEmpty(),
#     body('problem_id').isString().notEmpty(),
#     body('problem_slug').isString().notEmpty(),
#     async (req, res) => { ... }
#   );
#
# But in FastAPI, it's all automatic based on the type hint!
# ============================================================================
@router.post(
    "/",                          # Route path (POST /hint)
    response_model=HintResponse,  # Validate response against this schema
    status_code=200,              # HTTP status code on success
    summary="Generate AI hint",   # Short description for Swagger docs
    description="Generate an AI-powered hint for a coding problem. Maximum 3 hints per user per problem."
)
async def generate_hint(request: HintRequest) -> HintResponse:
    """
    Generate an AI-powered hint for a coding problem.
    
    This endpoint uses a LangChain agent with Groq (Llama 3.3 70B) to generate
    helpful hints without giving away the full solution.
    
    WORKFLOW:
    ---------
    1. Validate request (automatic via Pydantic)
    2. Check hint count (agent calls get_hint_count tool)
    3. If count >= 3, return 403 error
    4. Get submission history (agent calls get_submission_history tool)
    5. Get problem metadata (agent calls get_problem_metadata tool)
    6. Generate hint based on context (agent uses LLM)
    7. Save hint to database (agent calls save_hint tool)
    8. Return hint + hints_used count
    
    REQUEST BODY (HintRequest):
    ---------------------------
    {
        "user_id": "507f1f77bcf86cd799439011",      // MongoDB ObjectId
        "problem_id": "507f191e810c19729de860ea",   // MongoDB ObjectId
        "problem_slug": "two-sum"                    // URL-safe problem identifier
    }
    
    RESPONSE BODY (HintResponse):
    -----------------------------
    {
        "hint": "Consider using a hash map to store numbers you've seen...",
        "hints_used": 2  // Total hints used for this (user, problem) pair
    }
    
    ERROR RESPONSES:
    ----------------
    - 422 Unprocessable Entity: Invalid request body (missing fields, wrong types)
    - 403 Forbidden: User has already used 3 hints for this problem
    - 500 Internal Server Error: Agent execution failed (LLM error, tool error, etc.)
    
    COMPARISON TO EXPRESS.JS:
    -------------------------
    In Express, you would manually:
    - Validate the request body
    - Call services in sequence
    - Handle errors with try/catch
    - Return JSON responses
    
    In FastAPI, you:
    - Define the request/response schemas (Pydantic models)
    - Let the agent decide which tools to call
    - FastAPI handles validation and error responses automatically
    
    Args:
        request (HintRequest): Validated request body containing user_id, 
                               problem_id, and problem_slug
    
    Returns:
        HintResponse: Contains the generated hint and the total hints_used count
    
    Raises:
        HTTPException: 403 if max hints reached, 500 if agent execution fails
    """
    
    # ========================================================================
    # STEP 1: Prepare the agent input
    # ========================================================================
    # We construct a natural language prompt for the agent.
    # The agent will parse this and decide which tools to call.
    #
    # EXPRESS.JS EQUIVALENT:
    # ----------------------
    # const userInput = `User ${req.body.user_id} needs a hint for problem ${req.body.problem_slug}`;
    #
    # PYTHON PATTERN:
    # ---------------
    # We use an f-string (formatted string literal) to embed variables:
    #   f"User {request.user_id} needs a hint..."
    #
    # This is equivalent to JavaScript template literals:
    #   `User ${request.user_id} needs a hint...`
    #
    # WHY INCLUDE ALL THREE IDs?
    # --------------------------
    # - user_id: Needed to check hint count and save hint
    # - problem_id: Needed to check hint count and save hint
    # - problem_slug: Needed to fetch problem metadata from Express API
    #
    # The agent will extract these from the input and pass them to the tools.
    # ========================================================================
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            count_data = await _backend_get(
                client,
                "/api/agent/hint-count",
                {"user_id": request.user_id, "problem_id": request.problem_id},
            )
            existing_count = count_data["hint_count"]

            if existing_count >= 3:
                raise HTTPException(
                    status_code=403,
                    detail="You have already used all 3 hints for this problem",
                )

            hint_index = existing_count + 1

            problem_data = await _backend_get(
                client,
                f"/api/problems/{request.problem_slug}",
            )
            problem = problem_data.get("problem", problem_data)

            submission_history = await _backend_get(
                client,
                "/api/agent/submissions",
                {"user_id": request.user_id, "problem_id": request.problem_id},
            )
            previous_hints_data = await _backend_get(
                client,
                "/api/agent/hints",
                {"user_id": request.user_id, "problem_id": request.problem_id},
            )
            previous_hints = previous_hints_data.get("hints", [])

            prompt = _build_hint_prompt(
                hint_index=hint_index,
                problem=problem,
                submission_history=submission_history,
                previous_hints=previous_hints,
            )
            try:
                hint_text = await _generate_hint_with_llm(prompt)
            except Exception as llm_error:
                print(f"Warning: LLM hint generation failed, using fallback: {str(llm_error)}")
                hint_text = _generate_fallback_hint(
                    hint_index=hint_index,
                    problem=problem,
                    submission_history=submission_history,
                    previous_hints=previous_hints,
                )

            save_data = await _backend_post(
                client,
                "/api/agent/save-hint",
                {
                    "user_id": request.user_id,
                    "problem_id": request.problem_id,
                    "hint_text": hint_text,
                },
            )

            hints_used = save_data.get("hints_used", hint_index)
            hint_index = save_data.get("hint_index", hint_index)

    except HTTPException:
        raise
    except httpx.HTTPStatusError as e:
        status_code = e.response.status_code
        detail = "Failed to generate hint. Please try again later."
        try:
            body = e.response.json()
            detail = body.get("message") or body.get("error") or body.get("detail") or detail
        except ValueError:
            pass
        raise HTTPException(status_code=status_code, detail=detail)
    except Exception as e:
        print(f"Error generating hint: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate hint. Please try again later. Error: {str(e)}",
        )
    
    # ========================================================================
    # STEP 4: Return the response
    # ========================================================================
    # We create a HintResponse object and return it.
    # FastAPI will automatically:
    # - Validate the response against the HintResponse schema
    # - Convert the Python object to JSON
    # - Set the Content-Type header to application/json
    # - Return HTTP 200 status code
    #
    # EXPRESS.JS EQUIVALENT:
    # ----------------------
    # return res.status(200).json({
    #   hint: hintText,
    #   hints_used: hintsUsed
    # });
    #
    # FASTAPI PATTERN:
    # ----------------
    # We just return a HintResponse object:
    #   return HintResponse(hint=hint_text, hints_used=hints_used)
    #
    # FastAPI handles the rest automatically!
    #
    # RESPONSE VALIDATION:
    # --------------------
    # If hint_text is empty or hints_used is not between 1-3, FastAPI will
    # return a 500 error because the response doesn't match the schema.
    # This prevents us from accidentally returning invalid data.
    #
    # EXAMPLE RESPONSE:
    # -----------------
    # HTTP/1.1 200 OK
    # Content-Type: application/json
    #
    # {
    #   "hint": "Consider using a hash map to store numbers you've seen...",
    #   "hints_used": 2
    # }
    # ========================================================================
    return HintResponse(
        hint=hint_text,
        hints_used=hints_used,
        hint_index=hint_index
    )


# ============================================================================
# HOW TO USE THIS ROUTER IN main.py
# ============================================================================
# To make this endpoint available, you need to include this router in main.py:
#
# from fastapi import FastAPI
# from app.routers import hint  # Import the hint router
#
# app = FastAPI(title="CodeCourt AI Service")
#
# # Include the hint router
# app.include_router(hint.router)
#
# # Now the POST /hint endpoint is available!
#
# EXPRESS.JS EQUIVALENT:
# ----------------------
# const express = require('express');
# const hintRouter = require('./routers/hint');
#
# const app = express();
#
# // Mount the hint router
# app.use(hintRouter);
#
# // Now the POST /hint endpoint is available!
# ============================================================================


# ============================================================================
# TESTING THIS ENDPOINT
# ============================================================================
# You can test this endpoint using curl, Postman, or the frontend:
#
# CURL EXAMPLE:
# -------------
# curl -X POST http://localhost:8000/hint \
#   -H "Content-Type: application/json" \
#   -d '{
#     "user_id": "507f1f77bcf86cd799439011",
#     "problem_id": "507f191e810c19729de860ea",
#     "problem_slug": "two-sum"
#   }'
#
# EXPECTED RESPONSE:
# ------------------
# {
#   "hint": "Consider using a hash map to store numbers you've already seen. This allows O(1) lookup time.",
#   "hints_used": 2
# }
#
# SWAGGER UI:
# -----------
# FastAPI automatically generates interactive API docs at:
# http://localhost:8000/docs
#
# You can test the endpoint directly from the browser!
#
# FRONTEND INTEGRATION:
# ---------------------
# In your Next.js frontend, you would call this endpoint like:
#
# const response = await fetch('http://localhost:8000/hint', {
#   method: 'POST',
#   headers: { 'Content-Type': 'application/json' },
#   body: JSON.stringify({
#     user_id: '507f1f77bcf86cd799439011',
#     problem_id: '507f191e810c19729de860ea',
#     problem_slug: 'two-sum'
#   })
# });
#
# const data = await response.json();
# console.log(data.hint);  // "Consider using a hash map..."
# console.log(data.hints_used);  // 2
# ============================================================================

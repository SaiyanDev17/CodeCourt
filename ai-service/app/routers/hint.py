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
from fastapi import APIRouter, HTTPException
from app.models.schemas import HintRequest, HintResponse
from app.agent.executor import create_agent_executor


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


# ============================================================================
# CREATE THE AGENT EXECUTOR (SINGLETON)
# ============================================================================
# We create the agent executor ONCE when this module is imported.
# This is more efficient than creating it on every request.
#
# EXPRESS.JS EQUIVALENT:
# ----------------------
# In Express, you might do something similar:
#   const agentExecutor = createAgentExecutor();  // Created once at startup
#   
#   router.post('/hint', async (req, res) => {
#     const result = await agentExecutor.invoke(...);  // Reuse the same instance
#   });
#
# PYTHON PATTERN:
# ---------------
# We create the agent executor at module load time:
#   agent_executor = create_agent_executor()  # Created once when module loads
#   
#   @router.post("/")
#   async def generate_hint(request: HintRequest):
#     result = await agent_executor.ainvoke(...)  # Reuse the same instance
#
# WHY CREATE IT ONCE?
# -------------------
# 1. Performance: Creating an agent executor is expensive (loads LLM, tools, etc.)
# 2. Memory: Reusing the same instance saves memory
# 3. Connection pooling: The LLM client can maintain persistent connections
# 4. Startup validation: If there's a config error, we catch it at startup
#
# WHEN IS THIS EXECUTED?
# ----------------------
# This line runs when the module is first imported (e.g., in main.py).
# It's similar to initializing a database connection pool at startup.
# ============================================================================
agent_executor = create_agent_executor()


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
    user_input = (
        f"User {request.user_id} is requesting a hint for problem "
        f"{request.problem_slug} (problem ID: {request.problem_id}). "
        f"Generate a helpful hint without revealing the full solution."
    )
    
    # ========================================================================
    # STEP 2: Invoke the agent
    # ========================================================================
    # The new create_agent returns a CompiledStateGraph that expects input
    # in the format: {"messages": [{"role": "user", "content": "..."}]}
    #
    # The agent will:
    # 1. Parse the user message
    # 2. Decide which tools to call
    # 3. Call the tools in sequence
    # 4. Generate a hint based on the tool results
    # 5. Return the final response
    # ========================================================================
    try:
        # Invoke the agent with the user input in message format
        result = await agent_executor.ainvoke({
            "messages": [{"role": "user", "content": user_input}]
        })
        
        # Extract the hint text from the agent's output
        # The result contains a "messages" list, and the last message is the agent's response
        hint_text = result["messages"][-1].content
        
    except Exception as e:
        # ====================================================================
        # ERROR HANDLING
        # ====================================================================
        # If the agent execution fails, we catch the exception and return
        # a 500 error to the frontend.
        #
        # EXPRESS.JS EQUIVALENT:
        # ----------------------
        # catch (error) {
        #   console.error('Agent execution failed:', error);
        #   return res.status(500).json({
        #     error: 'Failed to generate hint',
        #     detail: error.message
        #   });
        # }
        #
        # FASTAPI PATTERN:
        # ----------------
        # We raise an HTTPException with status_code=500:
        #   raise HTTPException(status_code=500, detail="Error message")
        #
        # FastAPI will automatically:
        # - Return HTTP 500 status code
        # - Return JSON: {"detail": "Error message"}
        # - Log the error
        #
        # COMMON ERRORS:
        # --------------
        # - Groq API error: LLM service is down or rate limited
        # - Express API error: Backend service is unreachable
        # - Tool execution error: A tool call failed (e.g., database error)
        # - Parsing error: Agent couldn't parse the LLM's response
        #
        # WHY WE CATCH ALL EXCEPTIONS:
        # ----------------------------
        # We want to return a user-friendly error message instead of crashing.
        # The frontend will display: "Failed to generate hint. Please try again."
        # ====================================================================
        
        # Log the error for debugging (will appear in the console)
        print(f"Error generating hint: {str(e)}")
        
        # Raise an HTTP 500 error with a user-friendly message
        # FastAPI will automatically convert this to a JSON response:
        # {"detail": "Failed to generate hint. Please try again later."}
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate hint. Please try again later. Error: {str(e)}"
        )
    
    # ========================================================================
    # STEP 3: Get the hint count
    # ========================================================================
    # After the agent generates the hint, we need to return the total number
    # of hints used for this (user, problem) pair.
    #
    # The agent already called save_hint, which incremented the count.
    # Now we need to fetch the updated count from the database.
    #
    # EXPRESS.JS EQUIVALENT:
    # ----------------------
    # const hintsUsed = await hintService.getCount(req.body.user_id, req.body.problem_id);
    #
    # PYTHON PATTERN:
    # ---------------
    # We call the get_hint_count tool directly (not through the agent):
    #   from app.agent.tools import get_hint_count
    #   hints_used = await get_hint_count(request.user_id, request.problem_id)
    #
    # WHY NOT LET THE AGENT DO THIS?
    # -------------------------------
    # The agent already called save_hint, which returns the updated count.
    # But we don't have access to that return value here (it's in the agent's
    # internal state). So we need to fetch it again.
    #
    # OPTIMIZATION OPPORTUNITY:
    # -------------------------
    # In a production system, you might:
    # 1. Parse the agent's intermediate steps to extract the save_hint result
    # 2. Or modify the agent to return both the hint and the count
    # 3. Or cache the count in Redis to avoid an extra database call
    #
    # For now, we keep it simple and just fetch the count again.
    # ========================================================================
    try:
        # Import the get_hint_count tool
        from app.agent.tools import get_hint_count
        
        # Fetch the updated hint count from the database
        # This calls the Express API: GET /api/agent/hint-count?user_id=...&problem_id=...
        hints_used = await get_hint_count(
            user_id=request.user_id,
            problem_id=request.problem_id
        )
        
    except Exception as e:
        # If fetching the hint count fails, we still want to return the hint
        # We'll just set hints_used to 1 as a fallback
        print(f"Warning: Failed to fetch hint count: {str(e)}")
        hints_used = 1  # Fallback value
    
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
        hints_used=hints_used
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

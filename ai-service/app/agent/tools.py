# ============================================================================
# LangChain Tools for AI Hint Agent
# ============================================================================
# This file defines 4 tools that the AI agent can use to interact with the
# Express API backend. Each tool is decorated with @tool, which tells LangChain
# "this function is available for the AI to call."
#
# COMPARISON TO EXPRESS.JS (Node.js):
# -----------------------------------
# In Node.js, you might define tools as an array of objects:
#   const tools = [
#     { name: "get_hint_count", description: "...", function: async (args) => {...} }
#   ];
#
# In Python with LangChain, we use the @tool decorator:
#   @tool
#   async def get_hint_count(user_id: str, problem_id: str) -> int:
#       """Get the number of hints..."""
#       # implementation
#
# HOW THE AI KNOWS WHEN TO USE A TOOL:
# -------------------------------------
# 1. The AI reads the function NAME (e.g., "get_hint_count")
# 2. The AI reads the DOCSTRING (the text in triple quotes)
# 3. The AI reads the PARAMETER NAMES and TYPES (user_id: str, problem_id: str)
# 4. Based on the user's request, the AI decides which tool to call
#
# Example: User asks "Give me a hint for problem two-sum"
#   → AI thinks: "I need to check hint count first"
#   → AI calls: get_hint_count(user_id="123", problem_id="456")
#   → AI gets: 2 (user has used 2 hints)
#   → AI thinks: "They can get one more hint, let me fetch problem data"
#   → AI calls: get_problem_metadata(problem_slug="two-sum")
#   → AI generates hint based on the data
#   → AI calls: save_hint(user_id="123", problem_id="456", hint_text="Consider using a hash map...")
# ============================================================================

# ============================================================================
# IMPORTS
# ============================================================================
# httpx: Python's equivalent to axios in Node.js (for making HTTP requests)
# AsyncClient: Allows us to make async HTTP requests (like axios with async/await)
# tool: LangChain decorator that marks a function as an AI-callable tool
# settings: Our config object (contains EXPRESS_API_URL)
# ============================================================================
import httpx
from langchain_core.tools import tool
from app.config import settings


# ============================================================================
# TOOL 1: get_hint_count
# ============================================================================
# PURPOSE: Check how many hints the user has already received for this problem.
#          The AI agent MUST call this first to enforce the 3-hint limit.
#
# EXPRESS.JS EQUIVALENT:
# ----------------------
# async function getHintCount(userId, problemId) {
#   const response = await axios.get(
#     `${EXPRESS_API_URL}/api/agent/hint-count`,
#     { params: { user_id: userId, problem_id: problemId } }
#   );
#   return response.data.hint_count;
# }
#
# PYTHON DIFFERENCES:
# -------------------
# - We use 'async with' to create an httpx client (like creating an axios instance)
# - We use 'await client.get()' instead of 'await axios.get()'
# - We use 'params=' to pass query parameters (same as axios)
# - We call '.json()' to parse the response body (axios does this automatically)
# - We use f-strings for string interpolation: f"{url}/path" instead of `${url}/path`
# ============================================================================
@tool
async def get_hint_count(user_id: str, problem_id: str) -> int:
    """
    Get the number of hints already given for a user-problem pair.
    
    This tool MUST be called first before generating any hint to enforce
    the 3-hint limit per user per problem.
    
    Args:
        user_id: The ID of the user requesting the hint
        problem_id: The ID of the problem they need help with
    
    Returns:
        The number of hints already used (0, 1, 2, or 3)
    
    Example:
        count = await get_hint_count("user123", "problem456")
        # Returns: 2 (user has used 2 hints, can get 1 more)
    """
    # ========================================================================
    # ASYNC HTTP CLIENT PATTERN
    # ========================================================================
    # In Node.js with axios:
    #   const response = await axios.get(url, { params: {...} });
    #
    # In Python with httpx:
    #   async with httpx.AsyncClient() as client:
    #       response = await client.get(url, params={...})
    #
    # WHY 'async with'?
    # -----------------
    # - 'async with' is like a try/finally block that automatically closes the client
    # - It's similar to Node.js's automatic connection pooling in axios
    # - The client is created, used, and cleaned up automatically
    # ========================================================================
    async with httpx.AsyncClient() as client:
        # ====================================================================
        # MAKE THE HTTP GET REQUEST
        # ====================================================================
        # Node.js equivalent:
        #   const response = await axios.get(
        #     `${EXPRESS_API_URL}/api/agent/hint-count`,
        #     { params: { user_id: userId, problem_id: problemId } }
        #   );
        #
        # Python differences:
        #   - f"{settings.EXPRESS_API_URL}/..." is like `${EXPRESS_API_URL}/...`
        #   - params= is the same as axios's params option
        #   - await client.get() is like await axios.get()
        # ====================================================================
        response = await client.get(
            f"{settings.EXPRESS_API_URL}/api/agent/hint-count",
            params={"user_id": user_id, "problem_id": problem_id}
        )
        
        # ====================================================================
        # PARSE THE JSON RESPONSE
        # ====================================================================
        # Node.js with axios:
        #   const data = response.data;  // axios auto-parses JSON
        #   return data.hint_count;
        #
        # Python with httpx:
        #   data = response.json()  # Must explicitly call .json()
        #   return data["hint_count"]  # Use dict access with ["key"]
        #
        # WHY THE DIFFERENCE?
        # -------------------
        # - axios automatically parses JSON responses into response.data
        # - httpx keeps the raw response, you call .json() when you need it
        # - This gives you more control (you could also call .text() or .content)
        # ====================================================================
        data = response.json()
        return data["hint_count"]


# ============================================================================
# TOOL 2: get_submission_history
# ============================================================================
# PURPOSE: Fetch the user's previous submission attempts for this problem.
#          This helps the AI understand what the user has already tried.
#
# EXPRESS.JS EQUIVALENT:
# ----------------------
# async function getSubmissionHistory(userId, problemId) {
#   const response = await axios.get(
#     `${EXPRESS_API_URL}/api/submissions/problem/${problemId}`,
#     { params: { userId } }
#   );
#   return response.data;
# }
# ============================================================================
@tool
async def get_submission_history(user_id: str, problem_id: str) -> dict:
    """
    Get the submission history for a user-problem pair.
    
    This tool retrieves all previous submissions the user has made for this
    problem, including verdicts (AC, WA, TLE, etc.), execution times, and
    any compiler errors. The AI uses this to understand what approaches the
    user has already tried.
    
    Args:
        user_id: The ID of the user
        problem_id: The ID of the problem
    
    Returns:
        A dictionary containing an array of submission objects with fields:
        - verdict: AC, WA, TLE, MLE, RE, CE, or PENDING
        - executionTime: Time in milliseconds
        - memoryUsed: Memory in megabytes
        - compilerError: Error message (if verdict is CE)
        - createdAt: Timestamp of submission
    
    Example:
        history = await get_submission_history("user123", "problem456")
        # Returns: {
        #   "submissions": [
        #     {"verdict": "WA", "executionTime": 120, "createdAt": "..."},
        #     {"verdict": "TLE", "executionTime": 2000, "createdAt": "..."}
        #   ]
        # }
    """
    # ========================================================================
    # ASYNC HTTP CLIENT (same pattern as get_hint_count)
    # ========================================================================
    async with httpx.AsyncClient() as client:
        # ====================================================================
        # MAKE THE HTTP GET REQUEST
        # ====================================================================
        # Node.js equivalent:
        #   const response = await axios.get(
        #     `${EXPRESS_API_URL}/api/submissions/problem/${problemId}`,
        #     { params: { userId } }
        #   );
        #
        # Python differences:
        #   - f-string interpolation: f"/problem/{problem_id}" is like `/problem/${problemId}`
        #   - params= works the same as axios
        # ====================================================================
        response = await client.get(
            f"{settings.EXPRESS_API_URL}/api/submissions/problem/{problem_id}",
            params={"userId": user_id}
        )
        
        # ====================================================================
        # PARSE AND RETURN THE JSON RESPONSE
        # ====================================================================
        # Node.js: return response.data;
        # Python: return response.json()
        # ====================================================================
        return response.json()


# ============================================================================
# TOOL 3: get_problem_metadata
# ============================================================================
# PURPOSE: Fetch the problem's title, description, constraints, and sample
#          test cases. The AI uses this to understand what the problem is
#          asking and generate relevant hints.
#
# EXPRESS.JS EQUIVALENT:
# ----------------------
# async function getProblemMetadata(problemSlug) {
#   const response = await axios.get(
#     `${EXPRESS_API_URL}/api/problems/${problemSlug}`
#   );
#   return response.data;
# }
# ============================================================================
@tool
async def get_problem_metadata(problem_slug: str) -> dict:
    """
    Get problem metadata including title, description, constraints, and samples.
    
    This tool retrieves the full problem details so the AI can understand
    what the problem is asking and generate contextually relevant hints.
    
    Args:
        problem_slug: The URL-safe slug of the problem (e.g., "two-sum")
    
    Returns:
        A dictionary containing:
        - title: Problem title
        - description: Full problem description (markdown)
        - constraints: Input constraints and limits
        - timeLimit: Time limit in milliseconds
        - memoryLimit: Memory limit in megabytes
        - difficulty: "easy", "medium", or "hard"
        - sampleTestCases: Array of {input, output} objects
    
    Example:
        metadata = await get_problem_metadata("two-sum")
        # Returns: {
        #   "title": "Two Sum",
        #   "description": "Given an array of integers...",
        #   "difficulty": "easy",
        #   "sampleTestCases": [{"input": "[2,7,11,15]\n9", "output": "[0,1]"}]
        # }
    """
    # ========================================================================
    # ASYNC HTTP CLIENT (same pattern)
    # ========================================================================
    async with httpx.AsyncClient() as client:
        # ====================================================================
        # MAKE THE HTTP GET REQUEST
        # ====================================================================
        # Node.js equivalent:
        #   const response = await axios.get(
        #     `${EXPRESS_API_URL}/api/problems/${problemSlug}`
        #   );
        #
        # Python: Same pattern, using f-string for URL interpolation
        # ====================================================================
        response = await client.get(
            f"{settings.EXPRESS_API_URL}/api/problems/{problem_slug}"
        )
        
        # ====================================================================
        # PARSE AND RETURN THE JSON RESPONSE
        # ====================================================================
        return response.json()


# ============================================================================
# TOOL 4: save_hint
# ============================================================================
# PURPOSE: Save the generated hint to the database and increment the hint
#          count for this user-problem pair. The AI MUST call this after
#          generating a hint to ensure the count is updated.
#
# EXPRESS.JS EQUIVALENT:
# ----------------------
# async function saveHint(userId, problemId, hintText) {
#   const response = await axios.post(
#     `${EXPRESS_API_URL}/api/agent/save-hint`,
#     { user_id: userId, problem_id: problemId, hint_text: hintText }
#   );
#   return response.data;
# }
#
# KEY DIFFERENCE: POST with JSON body
# ------------------------------------
# In axios: axios.post(url, { key: value })
# In httpx: client.post(url, json={"key": "value"})
#           ^^^^^ Note the 'json=' parameter!
# ============================================================================
@tool
async def save_hint(user_id: str, problem_id: str, hint_text: str) -> dict:
    """
    Save a hint and increment the hint count for a user-problem pair.
    
    This tool MUST be called after the AI generates a hint to persist it
    to the database and update the hint count. This ensures the 3-hint
    limit is enforced correctly.
    
    Args:
        user_id: The ID of the user receiving the hint
        problem_id: The ID of the problem
        hint_text: The generated hint text (should NOT contain full solution)
    
    Returns:
        A dictionary containing:
        - success: Boolean indicating if the save was successful
        - hint_index: The index of this hint (1, 2, or 3)
        - hints_remaining: Number of hints remaining (2, 1, or 0)
    
    Example:
        result = await save_hint(
            "user123",
            "problem456",
            "Consider using a hash map to store values you've seen"
        )
        # Returns: {
        #   "success": true,
        #   "hint_index": 1,
        #   "hints_remaining": 2
        # }
    """
    # ========================================================================
    # ASYNC HTTP CLIENT (same pattern)
    # ========================================================================
    async with httpx.AsyncClient() as client:
        # ====================================================================
        # MAKE THE HTTP POST REQUEST WITH JSON BODY
        # ====================================================================
        # Node.js with axios:
        #   const response = await axios.post(
        #     `${EXPRESS_API_URL}/api/agent/save-hint`,
        #     { user_id: userId, problem_id: problemId, hint_text: hintText }
        #   );
        #
        # Python with httpx:
        #   response = await client.post(
        #     f"{settings.EXPRESS_API_URL}/api/agent/save-hint",
        #     json={"user_id": user_id, "problem_id": problem_id, "hint_text": hint_text}
        #   )
        #
        # KEY DIFFERENCE: json= parameter
        # --------------------------------
        # - In axios, the second argument is automatically sent as JSON
        # - In httpx, you MUST use json= to send JSON (otherwise it's form data)
        # - This is similar to fetch() in JavaScript:
        #     fetch(url, { method: 'POST', body: JSON.stringify(data) })
        # ====================================================================
        response = await client.post(
            f"{settings.EXPRESS_API_URL}/api/agent/save-hint",
            json={
                "user_id": user_id,
                "problem_id": problem_id,
                "hint_text": hint_text
            }
        )
        
        # ====================================================================
        # PARSE AND RETURN THE JSON RESPONSE
        # ====================================================================
        # Node.js: return response.data;
        # Python: return response.json()
        # ====================================================================
        return response.json()


# ============================================================================
# SUMMARY: ASYNC/AWAIT SYNTAX COMPARISON
# ============================================================================
#
# JavaScript (Node.js with axios):
# --------------------------------
# async function getTool(id) {
#   const response = await axios.get(`${API_URL}/resource/${id}`);
#   return response.data;
# }
#
# async function postTool(id, data) {
#   const response = await axios.post(`${API_URL}/resource`, { id, data });
#   return response.data;
# }
#
# Python (with httpx):
# --------------------
# async def get_tool(id: str) -> dict:
#     async with httpx.AsyncClient() as client:
#         response = await client.get(f"{API_URL}/resource/{id}")
#         return response.json()
#
# async def post_tool(id: str, data: str) -> dict:
#     async with httpx.AsyncClient() as client:
#         response = await client.post(
#             f"{API_URL}/resource",
#             json={"id": id, "data": data}
#         )
#         return response.json()
#
# KEY TAKEAWAYS:
# --------------
# 1. async/await syntax is nearly identical in Python and JavaScript
# 2. httpx is Python's axios (both support async HTTP requests)
# 3. Main differences:
#    - Python uses 'async with' for resource management (like try/finally)
#    - Python requires explicit .json() call (axios auto-parses)
#    - Python uses json= parameter for POST bodies (axios infers it)
#    - Python uses f-strings for interpolation (JS uses template literals)
# ============================================================================

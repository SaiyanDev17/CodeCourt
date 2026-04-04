# ============================================================================
# LangChain AgentExecutor Implementation
# ============================================================================
# This file creates the AI agent that generates hints for CodeCourt users.
# It wires together:
# 1. The Groq LLM (Llama 3.3 70B) - the "brain" that makes decisions
# 2. The tools (from tools.py) - the "hands" that fetch data
# 3. The prompt (from prompts.py) - the "instructions" that guide behavior
# 4. The AgentExecutor - the "orchestrator" that runs the tool-calling loop
#
# COMPARISON TO EXPRESS.JS (Node.js):
# -----------------------------------
# In Express, a typical controller function looks like this:
#
#   async function getHint(req, res) {
#     // 1. Extract request data
#     const { userId, problemId } = req.body;
#     
#     // 2. Call services in sequence (hardcoded flow)
#     const hintCount = await hintService.getCount(userId, problemId);
#     if (hintCount >= 3) {
#       return res.status(403).json({ error: "Max hints reached" });
#     }
#     
#     const history = await submissionService.getHistory(userId, problemId);
#     const problem = await problemService.getMetadata(problemId);
#     
#     // 3. Generate hint (maybe call OpenAI API)
#     const hint = await openai.generateHint(problem, history);
#     
#     // 4. Save hint
#     await hintService.save(userId, problemId, hint);
#     
#     // 5. Return response
#     return res.json({ hint });
#   }
#
# WITH LANGCHAIN AGENTEXECUTOR:
# ------------------------------
# Instead of hardcoding the flow, we let the LLM decide:
#
#   async def get_hint(request):
#     # 1. Extract request data
#     user_id = request.user_id
#     problem_id = request.problem_id
#     
#     # 2. Let the AI agent decide what to do
#     result = await agent_executor.ainvoke({
#       "input": f"Generate hint for user {user_id}, problem {problem_id}"
#     })
#     
#     # 3. The agent automatically:
#     #    - Calls get_hint_count
#     #    - Checks if count < 3
#     #    - Calls get_submission_history
#     #    - Calls get_problem_metadata
#     #    - Generates hint based on context
#     #    - Calls save_hint
#     #    - Returns the hint
#     
#     # 4. Return response
#     return {"hint": result["output"]}
#
# KEY DIFFERENCE:
# ---------------
# - Express controller: YOU decide the flow (imperative)
# - LangChain agent: THE AI decides the flow (declarative)
#
# WHY USE AN AGENT?
# -----------------
# 1. Flexibility: The AI can adapt its strategy based on context
#    - If hint_count is 3, it stops without calling other tools
#    - If submission_history shows TLE, it focuses on efficiency
#    - If submission_history shows WA, it focuses on edge cases
#
# 2. Natural language interface: You describe WHAT you want, not HOW
#    - "Generate a hint" vs. "Call service A, then B, then C"
#
# 3. Self-correction: If a tool call fails, the AI can try a different approach
#
# 4. Reasoning: The AI explains its thought process (useful for debugging)
#
# WHAT IS AN AGENTEXECUTOR?
# --------------------------
# Think of AgentExecutor as a "smart controller" that:
# 1. Receives a user request
# 2. Asks the LLM: "What should I do next?"
# 3. LLM responds with either:
#    a) A tool call: "Call get_hint_count with user_id=123, problem_id=456"
#    b) A final answer: "Here's your hint: Consider using a hash map..."
# 4. If (a), execute the tool and go back to step 2 with the result
# 5. If (b), return the answer to the user
#
# This loop continues until the LLM decides it has enough information to
# respond to the user.
#
# EXPRESS.JS ANALOGY:
# -------------------
# Imagine if your Express controller could dynamically decide which services
# to call based on the request context, without you writing if/else logic:
#
#   // Traditional Express (hardcoded flow)
#   async function getHint(req, res) {
#     const count = await getHintCount();
#     if (count >= 3) return res.status(403).json({...});
#     const history = await getHistory();
#     const problem = await getProblem();
#     const hint = generateHint(problem, history);
#     await saveHint(hint);
#     return res.json({ hint });
#   }
#
#   // With AgentExecutor (AI decides the flow)
#   async function getHint(req, res) {
#     const result = await agentExecutor.invoke({
#       input: "Generate a hint",
#       context: { userId, problemId }
#     });
#     // The AI automatically figures out:
#     // - Which services to call
#     // - In what order
#     // - How to handle errors
#     // - When to stop
#     return res.json({ hint: result.output });
#   }
# ============================================================================

# ============================================================================
# IMPORTS
# ============================================================================
# langchain_groq: Groq's LangChain integration (provides ChatGroq class)
# create_tool_calling_agent: Factory function that creates an agent
# AgentExecutor: The orchestrator that runs the agent loop
# create_hint_prompt: Our custom prompt template from prompts.py
# tools: The 4 tools the agent can use (from tools.py)
# settings: Configuration object with API keys (from config.py)
# ============================================================================
from langchain_groq import ChatGroq
from langchain.agents import create_agent
from app.agent.prompts import HINT_SYSTEM_PROMPT
from app.agent.tools import (
    get_hint_count,
    get_submission_history,
    get_problem_metadata,
    save_hint
)
from app.config import settings


# ============================================================================
# create_agent_executor
# ============================================================================
# This function creates and configures the LangChain AgentExecutor.
# It's the main entry point for the AI hint generation system.
#
# EXPRESS.JS EQUIVALENT:
# ----------------------
# In Express, you might have a factory function that creates a controller:
#
#   function createHintController(openaiClient, services) {
#     return async function getHint(req, res) {
#       // Controller logic here
#     };
#   }
#
# PYTHON WITH LANGCHAIN:
# ----------------------
# We create a factory function that returns an AgentExecutor:
#
#   def create_agent_executor() -> AgentExecutor:
#     llm = ChatGroq(...)
#     tools = [...]
#     prompt = create_hint_prompt()
#     agent = create_tool_calling_agent(llm, tools, prompt)
#     return AgentExecutor(agent=agent, tools=tools)
#
# WHY A FACTORY FUNCTION?
# ------------------------
# 1. Encapsulation: All agent setup logic is in one place
# 2. Reusability: Can create multiple agents with different configs
# 3. Testability: Easy to mock the LLM or tools in tests
# 4. Lazy initialization: Agent is only created when needed
#
# USAGE IN main.py:
# -----------------
# from app.agent.executor import create_agent_executor
#
# # Create the agent once at startup
# agent_executor = create_agent_executor()
#
# # Use it in the /hint endpoint
# @app.post("/hint")
# async def generate_hint(request: HintRequest):
#     result = await agent_executor.ainvoke({
#         "input": f"User {request.user_id} needs a hint for {request.problem_slug}"
#     })
#     return {"hint": result["output"]}
# ============================================================================
def create_agent_executor():
    """
    Create and configure the LangChain agent for hint generation.
    
    This function wires together:
    1. The Groq LLM (Llama 3.3 70B) - makes decisions about which tools to use
    2. The tools (get_hint_count, get_submission_history, etc.) - fetch data
    3. The system prompt (HINT_SYSTEM_PROMPT) - guides the AI's behavior
    4. The initialize_agent function - creates a stable agent using AgentType
    
    Returns:
        Agent: A configured agent ready to generate hints
    
    Usage:
        agent_executor = create_agent_executor()
        
        result = await agent_executor.ainvoke({
            "input": "User user123 needs a hint for problem two-sum (ID: 456)"
        })
        
        hint_text = result["output"]
    
    EXPRESS.JS ANALOGY:
    -------------------
    This is like creating a smart Express controller that can:
    - Decide which services to call based on the request
    - Call multiple services in sequence
    - Handle errors and edge cases
    - Return a final response
    
    But instead of you writing if/else logic, the AI figures it out.
    """
    
    # ========================================================================
    # STEP 1: Initialize the LLM (Groq with Llama 3.3 70B)
    # ========================================================================
    llm = ChatGroq(
        model="llama-3.3-70b-versatile",  # Groq's Llama 3.3 70B model
        api_key=settings.GROQ_API_KEY,    # API key from .env file
        temperature=0.7,                   # Balanced creativity (0.0-1.0)
    )
    
    # ========================================================================
    # STEP 2: Define the tools the agent can use
    # ========================================================================
    tools = [
        get_hint_count,          # Check how many hints user has used
        get_submission_history,  # Get user's previous submission attempts
        get_problem_metadata,    # Get problem details (title, description, etc.)
        save_hint,               # Save the generated hint to the database
    ]
    
    # ========================================================================
    # STEP 3: Create the agent using the modern create_agent method
    # ========================================================================
    # create_agent is the modern way to create agents in LangChain (v1.2+).
    # It takes:
    # - model: The language model (ChatGroq instance)
    # - tools: List of tools the agent can use
    # - system_prompt: The system message that guides the agent's behavior
    #
    # This returns a CompiledStateGraph that can be invoked like:
    #   result = await agent.ainvoke({"messages": [{"role": "user", "content": "..."}]})
    #
    # The new API is simpler and more flexible than the old initialize_agent.
    # ========================================================================
    agent_executor = create_agent(
        model=llm,
        tools=tools,
        system_prompt=HINT_SYSTEM_PROMPT
    )
    
    return agent_executor


# ============================================================================
# USAGE EXAMPLE (for reference, not executed)
# ============================================================================
# This shows how the AgentExecutor will be used in main.py:
#
# from fastapi import FastAPI
# from app.agent.executor import create_agent_executor
# from app.models.schemas import HintRequest, HintResponse
#
# app = FastAPI()
#
# # Create the agent once at startup
# agent_executor = create_agent_executor()
#
# @app.post("/hint", response_model=HintResponse)
# async def generate_hint(request: HintRequest):
#     """
#     Generate a hint for a user-problem pair.
#     
#     The agent will:
#     1. Check hint count (max 3 per user per problem)
#     2. Get submission history (to understand what they've tried)
#     3. Get problem metadata (to understand the problem)
#     4. Generate a hint based on context
#     5. Save the hint to the database
#     6. Return the hint to the user
#     """
#     # Invoke the agent with user input
#     result = await agent_executor.ainvoke({
#         "input": f"User {request.user_id} is requesting a hint for problem {request.problem_slug} (ID: {request.problem_id})"
#     })
#     
#     # Extract the hint from the result
#     hint_text = result["output"]
#     
#     # Return the response
#     return HintResponse(
#         hint=hint_text,
#         hints_used=...,  # This would be fetched from the database
#         hints_remaining=...
#     )
#
# ============================================================================
# COMPARISON TO TRADITIONAL EXPRESS.JS CONTROLLER
# ============================================================================
#
# TRADITIONAL EXPRESS.JS (hardcoded flow):
# -----------------------------------------
# async function getHint(req, res) {
#   const { userId, problemId, problemSlug } = req.body;
#   
#   // Step 1: Check hint count
#   const hintCount = await hintService.getCount(userId, problemId);
#   if (hintCount >= 3) {
#     return res.status(403).json({ error: "Max hints reached" });
#   }
#   
#   // Step 2: Get submission history
#   const history = await submissionService.getHistory(userId, problemId);
#   
#   // Step 3: Get problem metadata
#   const problem = await problemService.getMetadata(problemSlug);
#   
#   // Step 4: Generate hint (call OpenAI)
#   const hint = await openai.chat({
#     messages: [
#       { role: "system", content: "You are a tutor..." },
#       { role: "user", content: `Problem: ${problem.title}\nHistory: ${JSON.stringify(history)}\nGenerate a hint.` }
#     ]
#   });
#   
#   // Step 5: Save hint
#   await hintService.save(userId, problemId, hint);
#   
#   // Step 6: Return response
#   return res.json({ hint });
# }
#
# WITH LANGCHAIN AGENTEXECUTOR (AI decides the flow):
# ----------------------------------------------------
# async def generate_hint(request: HintRequest):
#   # Let the AI agent decide what to do
#   result = await agent_executor.ainvoke({
#     "input": f"User {request.user_id} needs a hint for {request.problem_slug}"
#   })
#   
#   # The agent automatically:
#   # - Calls get_hint_count
#   # - Checks if count < 3
#   # - Calls get_submission_history
#   # - Calls get_problem_metadata
#   # - Generates hint based on context
#   # - Calls save_hint
#   # - Returns the hint
#   
#   return {"hint": result["output"]}
#
# KEY BENEFITS OF AGENTEXECUTOR:
# -------------------------------
# 1. Flexibility: AI adapts strategy based on context
#    - If hint_count is 3, stops immediately
#    - If history shows TLE, focuses on efficiency
#    - If history shows WA, focuses on edge cases
#
# 2. Less code: No need to write if/else logic for every scenario
#
# 3. Natural language: Describe WHAT you want, not HOW to do it
#
# 4. Self-correction: If a tool call fails, AI can try a different approach
#
# 5. Reasoning: AI explains its thought process (useful for debugging)
#
# TRADE-OFFS:
# -----------
# - Slower: Each tool call requires an LLM inference (adds latency)
# - Less predictable: AI might call tools in unexpected order
# - Harder to debug: Need to inspect agent_scratchpad to see what happened
# - More expensive: More LLM calls = higher API costs
#
# WHEN TO USE AGENTEXECUTOR:
# ---------------------------
# - Complex workflows with many decision points
# - Workflows that need to adapt based on context
# - Workflows where the optimal path isn't always the same
# - Workflows where you want natural language reasoning
#
# WHEN NOT TO USE AGENTEXECUTOR:
# -------------------------------
# - Simple, linear workflows (just call services directly)
# - Performance-critical paths (agents add latency)
# - Workflows where predictability is critical (use hardcoded logic)
# - Workflows with strict compliance requirements (agents can be unpredictable)
# ============================================================================

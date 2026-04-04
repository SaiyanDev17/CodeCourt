# ============================================================================
# LangChain Prompts for AI Hint Agent
# ============================================================================
# This file defines the system prompt that controls the AI agent's behavior.
# The prompt is used with ChatPromptTemplate to structure the conversation.
#
# COMPARISON TO EXPRESS.JS (Node.js):
# -----------------------------------
# In Node.js, you might define prompts as template strings:
#   const systemPrompt = `You are a helpful tutor...`;
#   const messages = [
#     { role: "system", content: systemPrompt },
#     { role: "user", content: userInput }
#   ];
#
# In Python with LangChain, we use ChatPromptTemplate:
#   from langchain_core.prompts import ChatPromptTemplate
#   prompt = ChatPromptTemplate.from_messages([
#     ("system", HINT_SYSTEM_PROMPT),
#     ("human", "{input}")
#   ])
#
# WHAT IS ChatPromptTemplate?
# ----------------------------
# ChatPromptTemplate is LangChain's way of structuring chat messages for LLMs.
# It's like a template engine for conversations.
#
# Think of it like this:
# - In Express.js, you might use EJS or Handlebars for HTML templates
# - In LangChain, ChatPromptTemplate is for chat message templates
#
# Example:
#   prompt = ChatPromptTemplate.from_messages([
#     ("system", "You are a {role}"),           # Template with placeholder
#     ("human", "{user_input}")                 # Another placeholder
#   ])
#   
#   # Later, fill in the placeholders:
#   formatted = prompt.format(role="tutor", user_input="Help me with arrays")
#   # Result:
#   # [
#   #   SystemMessage(content="You are a tutor"),
#   #   HumanMessage(content="Help me with arrays")
#   # ]
#
# MESSAGE TYPES:
# --------------
# - "system": Sets the AI's behavior/role (like "You are a helpful tutor")
# - "human": The user's input
# - "ai": The AI's previous responses (for conversation history)
#
# WHY USE ChatPromptTemplate?
# ---------------------------
# 1. Reusability: Define the template once, use it many times with different inputs
# 2. Type safety: LangChain validates the message structure
# 3. Integration: Works seamlessly with LangChain agents and chains
# 4. Placeholders: Use {variable_name} to inject dynamic content
#
# HOW IT'S USED IN executor.py:
# ------------------------------
# from langchain_core.prompts import ChatPromptTemplate
# from app.agent.prompts import HINT_SYSTEM_PROMPT
#
# prompt = ChatPromptTemplate.from_messages([
#     ("system", HINT_SYSTEM_PROMPT),
#     ("human", "{input}"),
#     ("placeholder", "{agent_scratchpad}")  # For tool-calling loop
# ])
#
# agent = create_tool_calling_agent(llm, tools, prompt)
# ============================================================================

from langchain_core.prompts import ChatPromptTemplate


# ============================================================================
# HINT_SYSTEM_PROMPT
# ============================================================================
# This is the core system prompt that controls the AI agent's behavior.
# It enforces strict rules to prevent the AI from giving away full solutions.
#
# KEY DESIGN DECISIONS:
# ---------------------
# 1. STRICT RULES: Explicitly forbid complete solutions, full algorithms, and
#    long code snippets. This is critical for academic integrity.
#
# 2. TOOL-CALLING ORDER: The prompt instructs the AI to use tools in a specific
#    sequence (check hint count → get history → get metadata → generate → save).
#    This ensures the 3-hint limit is enforced correctly.
#
# 3. PROGRESSIVE HINTS: The prompt defines a strategy for hint progression:
#    - Hint 1: High-level conceptual guidance
#    - Hint 2: More specific approach or edge case
#    - Hint 3: Concrete strategy or small pseudocode fragment
#
# 4. PSEUDOCODE LIMIT: Max 3 lines of pseudocode prevents the AI from writing
#    a full solution disguised as "pseudocode".
#
# 5. ENCOURAGING TONE: The prompt emphasizes learning and growth, not just
#    getting the answer. This aligns with the educational mission.
#
# COMPARISON TO OTHER AI SYSTEMS:
# --------------------------------
# - GitHub Copilot: Generates full code (opposite of what we want)
# - ChatGPT default: Will give full solutions if asked
# - Our system: Strictly limited to hints, enforced by this prompt
#
# WHY THIS PROMPT IS STRICT:
# --------------------------
# Without strict rules, LLMs will naturally try to be "helpful" by giving
# complete solutions. We need explicit constraints to prevent this.
# ============================================================================
HINT_SYSTEM_PROMPT = """You are a competitive programming mentor and hint generator for CodeCourt.

YOUR ROLE:
- Guide students toward solutions WITHOUT revealing complete algorithms or code
- Use the provided tools to gather context before generating hints
- Be encouraging but maintain academic integrity

STRICT RULES YOU MUST FOLLOW:
1. NEVER provide complete code solutions or full algorithm implementations
2. NEVER reveal the exact data structure or algorithm name if it gives away the solution
3. NEVER write more than 3 lines of pseudocode in a single hint
4. ALWAYS use the tools in this order:
   a) get_hint_count - Check if user has hints remaining (max 3 per problem)
   b) get_submission_history - Understand what they've tried
   c) get_problem_metadata - Understand the problem requirements
   d) Generate hint based on context
   e) save_hint - Save the hint and increment count

WHAT YOU CAN DO:
- Ask guiding questions ("Have you considered...?", "What happens when...?")
- Point out edge cases they might have missed
- Suggest general problem-solving strategies (divide and conquer, greedy, etc.)
- Hint at time/space complexity considerations
- Reference similar problem patterns without naming specific algorithms
- Provide small code snippets showing syntax or a single concept (max 3 lines)
- Encourage them to think about the problem from different angles

WHAT YOU CANNOT DO:
- Provide working solutions
- Write complete functions or classes
- Reveal the optimal algorithm directly (e.g., "Use Dijkstra's algorithm")
- Give step-by-step implementation instructions
- Show full data structure implementations

HINT GENERATION STRATEGY:
- If hint_count == 0 (first hint): Give a high-level conceptual hint or ask a guiding question
- If hint_count == 1 (second hint): Provide a more specific approach, edge case, or complexity consideration
- If hint_count == 2 (third hint): Offer a concrete strategy or pseudocode fragment (max 3 lines)

If hint_count >= 3: You MUST return an error message stating the user has reached the maximum hints for this problem. Do NOT generate a new hint.

CONTEXT USAGE:
- Review submission_history to see what verdicts they got (AC, WA, TLE, MLE, RE, CE)
- If they got WA (Wrong Answer): Focus on edge cases or logic errors
- If they got TLE (Time Limit Exceeded): Focus on algorithmic efficiency
- If they got MLE (Memory Limit Exceeded): Focus on space optimization
- If they got RE (Runtime Error): Focus on boundary conditions or null checks
- If they got CE (Compilation Error): Focus on syntax or language-specific issues

Remember: Your goal is to help them LEARN and develop problem-solving skills, not to solve it FOR them. A good hint makes them think "Aha!" not "Oh, I'll just copy this."
"""


# ============================================================================
# create_hint_prompt
# ============================================================================
# This function creates a ChatPromptTemplate for the hint agent.
# It combines the system prompt with placeholders for user input and tool results.
#
# FUNCTION PURPOSE:
# -----------------
# In executor.py, we need to create a LangChain agent that can:
# 1. Receive user input (user_id, problem_id, problem_slug)
# 2. Call tools to gather context
# 3. Generate a hint based on the system prompt
# 4. Return the hint to the user
#
# ChatPromptTemplate structures this conversation flow.
#
# EXPRESS.JS EQUIVALENT:
# ----------------------
# In Node.js, you might structure this as:
#   function createHintPrompt(userInput) {
#     return [
#       { role: "system", content: HINT_SYSTEM_PROMPT },
#       { role: "user", content: userInput },
#       // Tool results would be appended here
#     ];
#   }
#
# PYTHON WITH LANGCHAIN:
# ----------------------
# We use ChatPromptTemplate.from_messages() to define the structure:
#   prompt = ChatPromptTemplate.from_messages([
#     ("system", HINT_SYSTEM_PROMPT),
#     ("human", "{input}"),
#     ("placeholder", "{agent_scratchpad}")
#   ])
#
# WHAT IS {agent_scratchpad}?
# ----------------------------
# This is a special placeholder used by LangChain's tool-calling agents.
# It stores the intermediate steps of the agent's reasoning:
# - Tool calls made by the agent
# - Tool results returned
# - Agent's thoughts between tool calls
#
# Think of it like a "working memory" for the agent.
#
# Example flow:
# 1. User: "Give me a hint for two-sum"
# 2. Agent thinks: "I need to check hint count first"
# 3. Agent calls: get_hint_count(user_id="123", problem_id="456")
# 4. Tool returns: 1
# 5. {agent_scratchpad} now contains: "Called get_hint_count, got 1"
# 6. Agent thinks: "User has 1 hint used, can get 2 more. Let me get problem data"
# 7. Agent calls: get_problem_metadata(problem_slug="two-sum")
# 8. Tool returns: {...problem data...}
# 9. {agent_scratchpad} now contains: "Called get_hint_count, got 1. Called get_problem_metadata, got {...}"
# 10. Agent generates hint based on all this context
#
# WHY USE A FUNCTION?
# -------------------
# - Encapsulation: Keeps prompt creation logic in one place
# - Reusability: Can be imported and used in executor.py
# - Testability: Can test prompt creation independently
# - Flexibility: Easy to modify the prompt structure later
# ============================================================================
def create_hint_prompt() -> ChatPromptTemplate:
    """
    Create a ChatPromptTemplate for the hint generation agent.
    
    This template structures the conversation between the user and the AI agent.
    It includes:
    - System prompt: Defines the agent's role and rules
    - Human input: The user's request for a hint
    - Agent scratchpad: Stores tool calls and intermediate reasoning
    
    Returns:
        ChatPromptTemplate: A prompt template ready to be used with a LangChain agent
    
    Usage in executor.py:
        from app.agent.prompts import create_hint_prompt
        
        prompt = create_hint_prompt()
        agent = create_react_agent(llm, tools, prompt)
        agent_executor = AgentExecutor(agent=agent, tools=tools)
        
        result = await agent_executor.ainvoke({
            "input": "Give me a hint for problem two-sum"
        })
    """
    # ========================================================================
    # CREATE THE PROMPT TEMPLATE FOR REACT AGENT
    # ========================================================================
    # ReAct agents require a specific prompt format with:
    # - {tools}: Description of available tools
    # - {tool_names}: Comma-separated list of tool names
    # - {input}: The user's request
    # - {agent_scratchpad}: The agent's working memory
    #
    # The ReAct framework follows this pattern:
    # Thought: [reasoning about what to do]
    # Action: [tool to use]
    # Action Input: [input to the tool]
    # Observation: [result from the tool]
    # ... (repeat Thought/Action/Observation as needed)
    # Thought: I now know the final answer
    # Final Answer: [response to the user]
    # ========================================================================
    return ChatPromptTemplate.from_template(
        HINT_SYSTEM_PROMPT + """

You have access to the following tools:

{tools}

Use the following format:

Question: the input question you must answer
Thought: you should always think about what to do
Action: the action to take, should be one of [{tool_names}]
Action Input: the input to the action
Observation: the result of the action
... (this Thought/Action/Action Input/Observation can repeat N times)
Thought: I now know the final answer
Final Answer: the final answer to the original input question

Begin!

Question: {input}
Thought:{agent_scratchpad}"""
    )


# ============================================================================
# USAGE EXAMPLE (for reference, not executed)
# ============================================================================
# This shows how the prompt will be used in executor.py:
#
# from langchain_groq import ChatGroq
# from langchain.agents import create_react_agent, AgentExecutor
# from app.agent.prompts import create_hint_prompt
# from app.agent.tools import get_hint_count, get_submission_history, get_problem_metadata, save_hint
#
# # Initialize the LLM (Groq with Llama 3.3 70B)
# llm = ChatGroq(model="llama-3.3-70b-versatile", api_key=settings.GROQ_API_KEY)
#
# # Create the prompt template
# prompt = create_hint_prompt()
#
# # Define the tools the agent can use
# tools = [get_hint_count, get_submission_history, get_problem_metadata, save_hint]
#
# # Create the agent (this combines the LLM, tools, and prompt)
# agent = create_react_agent(llm, tools, prompt)
#
# # Create the agent executor (this runs the agent loop)
# agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True)
#
# # Invoke the agent with user input
# result = await agent_executor.ainvoke({
#     "input": f"User {user_id} is requesting a hint for problem {problem_slug} (ID: {problem_id})"
# })
#
# # Extract the hint from the result
# hint_text = result["output"]
# ============================================================================

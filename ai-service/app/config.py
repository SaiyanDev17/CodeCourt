# ============================================================================
# Configuration Module for CodeCourt AI Service
# ============================================================================
# This file handles loading environment variables from the .env file.
#
# COMPARISON TO EXPRESS.JS (Node.js):
# -----------------------------------
# In Express, you would do:
#   require('dotenv').config();  // Load .env file into process.env
#   const apiKey = process.env.GROQ_API_KEY;  // Access as string
#
# In FastAPI (Python), we use:
#   - pydantic-settings: Automatically loads .env and validates types
#   - BaseSettings class: Defines our config schema with type hints
#   - settings object: A singleton instance we import everywhere
#
# BENEFITS OF PYTHON APPROACH:
# - Type safety: PORT is guaranteed to be an int, not a string
# - Validation: Pydantic will error if required vars are missing
# - Defaults: Built into the class definition
# - IDE support: Autocomplete works because it's a typed object
# ============================================================================

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """
    Application configuration settings loaded from environment variables.
    
    EQUIVALENT TO EXPRESS.JS:
    -------------------------
    In Express, you'd access env vars directly from process.env:
        const groqKey = process.env.GROQ_API_KEY;
        const apiUrl = process.env.EXPRESS_API_URL || 'http://localhost:5000';
        const port = parseInt(process.env.PORT || '8000');
    
    In Python with Pydantic, we define a class with typed fields:
        settings.GROQ_API_KEY  # Automatically loaded and validated
        settings.EXPRESS_API_URL  # Has a default value
        settings.PORT  # Automatically converted to int
    
    HOW IT WORKS:
    -------------
    1. When you create Settings(), Pydantic looks for a .env file
    2. It reads each variable and matches it to a field in this class
    3. It converts types automatically (e.g., "8000" string → 8000 int)
    4. It validates required fields exist (GROQ_API_KEY must be present)
    5. It uses default values if a variable is missing (PORT defaults to 8000)
    """
    
    # ========================================================================
    # GROQ API Configuration
    # ========================================================================
    # This is the API key for the Groq LLM service (Llama 3.3 70B model).
    # 
    # EXPRESS.JS EQUIVALENT:
    #   const groqApiKey = process.env.GROQ_API_KEY;
    #   if (!groqApiKey) throw new Error('GROQ_API_KEY is required');
    #
    # PYTHON DIFFERENCE:
    #   - No default value means it's REQUIRED
    #   - Pydantic will automatically throw an error if missing
    #   - Type hint 'str' ensures it's a string
    # ========================================================================
    GROQ_API_KEY: str
    
    # ========================================================================
    # Express API URL (Internal Communication)
    # ========================================================================
    # This is the URL of the Express.js backend API that the AI service
    # will call to fetch user data, problem metadata, and save hints.
    #
    # EXPRESS.JS EQUIVALENT:
    #   const expressApiUrl = process.env.EXPRESS_API_URL || 'http://localhost:5000';
    #
    # PYTHON DIFFERENCE:
    #   - The '= "http://localhost:5000"' provides a default value
    #   - If EXPRESS_API_URL is not in .env, it uses the default
    #   - No need for the '||' operator like in JavaScript
    # ========================================================================
    EXPRESS_API_URL: str = "http://localhost:5000"
    
    # ========================================================================
    # Server Port
    # ========================================================================
    # The port number the FastAPI server will listen on.
    #
    # EXPRESS.JS EQUIVALENT:
    #   const port = parseInt(process.env.PORT || '8000');
    #
    # PYTHON DIFFERENCE:
    #   - Type hint 'int' means Pydantic automatically converts "8000" → 8000
    #   - In Node.js, process.env.PORT is always a string, so you must parseInt()
    #   - In Python, Pydantic handles the conversion for you
    #   - Default value is 8000 if PORT is not in .env
    # ========================================================================
    PORT: int = 8000
    
    # ========================================================================
    # Pydantic Configuration
    # ========================================================================
    # This inner class tells Pydantic where to find the .env file.
    #
    # EXPRESS.JS EQUIVALENT:
    #   require('dotenv').config({ path: '.env' });
    #
    # PYTHON DIFFERENCE:
    #   - In Express, you call .config() at the top of your entry file
    #   - In Python, you define the path in the Settings class itself
    #   - Pydantic automatically loads the file when Settings() is instantiated
    # ========================================================================
    class Config:
        # Path to the .env file (relative to where the app runs)
        env_file = ".env"
        
        # Allow extra fields in .env that aren't defined in this class
        # (similar to how process.env in Node.js has all env vars)
        extra = "ignore"
        
        # Case-sensitive variable names (GROQ_API_KEY != groq_api_key)
        case_sensitive = True


# ============================================================================
# Singleton Settings Instance
# ============================================================================
# Create a single instance of Settings that will be imported everywhere.
#
# EXPRESS.JS EQUIVALENT:
# ----------------------
# In Express, you don't create an instance. You just use process.env directly:
#   // In any file:
#   const apiKey = process.env.GROQ_API_KEY;
#
# PYTHON PATTERN:
# ---------------
# We create ONE instance here and import it everywhere:
#   # In other files:
#   from app.config import settings
#   api_key = settings.GROQ_API_KEY
#
# WHY THIS PATTERN?
# -----------------
# 1. Type safety: Your IDE knows what fields exist
# 2. Single source of truth: Only loaded once at startup
# 3. Easy to mock in tests: Just replace the settings object
# 4. Validation happens once: Errors are caught at startup, not runtime
#
# WHEN IS THIS LOADED?
# --------------------
# This line runs when you first import this module (e.g., in main.py).
# It's similar to calling require('dotenv').config() at the top of server.js.
# ============================================================================
settings = Settings()


# ============================================================================
# USAGE EXAMPLES
# ============================================================================
# 
# In other Python files, you'll import and use settings like this:
#
#   from app.config import settings
#
#   # Access the Groq API key
#   groq_key = settings.GROQ_API_KEY
#
#   # Access the Express API URL
#   api_url = settings.EXPRESS_API_URL
#
#   # Access the port number (as an integer, not a string!)
#   port = settings.PORT
#
# COMPARISON TO EXPRESS.JS:
# -------------------------
# Express (Node.js):
#   const groqKey = process.env.GROQ_API_KEY;  // Always a string or undefined
#   const port = parseInt(process.env.PORT);   // Manual conversion needed
#
# FastAPI (Python):
#   groq_key = settings.GROQ_API_KEY  # Validated string
#   port = settings.PORT              # Already an integer
#
# ============================================================================

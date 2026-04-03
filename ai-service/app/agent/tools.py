# Tool definitions for the AI agent
# Tools: get_hint_count, get_submission_history, get_problem_metadata, save_hint

def get_hint_count(user_id: str, problem_id: str) -> int:
    """Get the number of hints already given for a user-problem pair"""
    pass

def get_submission_history(user_id: str, problem_id: str):
    """Get submission history for a user-problem pair"""
    pass

def get_problem_metadata(problem_slug: str):
    """Get problem metadata"""
    pass

def save_hint(user_id: str, problem_id: str, hint_text: str):
    """Save a hint and increment the hint count"""
    pass

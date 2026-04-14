"""
Pytest configuration and fixtures for AI service tests
"""
import pytest
from unittest.mock import MagicMock


@pytest.fixture(autouse=True)
def mock_agent_executor(monkeypatch):
    """
    Mock the agent executor to prevent import-time initialization during tests.
    This fixture runs automatically for all tests.
    """
    # Mock the create_agent_executor function before any imports
    mock_executor = MagicMock()
    mock_executor.ainvoke = MagicMock(return_value={
        "messages": [{"content": "Test hint"}]
    })
    
    def mock_create_agent_executor():
        return mock_executor
    
    # Patch the function in the agent.executor module
    monkeypatch.setattr(
        "app.agent.executor.create_agent_executor",
        mock_create_agent_executor
    )
    
    return mock_executor

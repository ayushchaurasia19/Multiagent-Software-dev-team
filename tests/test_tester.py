# pyrefly: ignore [missing-import]
import pytest
from unittest.mock import MagicMock
from langchain_core.messages import AIMessage, HumanMessage
from src.agents.tester import run_tester_agent

def test_tester_agent(mocker):
    # Mock ChatGoogleGenerativeAI in tester.py
    mock_llm_class = mocker.patch("src.agents.tester.ChatGoogleGenerativeAI")
    mock_llm_instance = mock_llm_class.return_value
    
    mock_bound_llm = MagicMock()
    mock_llm_instance.bind_tools.return_value = mock_bound_llm
    
    tool_call_msg = AIMessage(
        content="", 
        tool_calls=[{"name": "write_code_to_disk", "args": {"filepath": "tests/test_api.py", "code": "def test_hello(): pass"}, "id": "call_t"}]
    )
    mock_bound_llm.invoke.return_value = tool_call_msg

    state = {
        "requirements": "Build a simple app", 
        "backend_tasks": ["Task 1"], 
        "review_status": "", 
        "review_feedback": [], 
        "review_count": 0, 
        "messages": [], 
        "tester_messages": []
    }
    result = run_tester_agent(state)

    assert len(result["tester_messages"]) == 2
    assert isinstance(result["tester_messages"][0], HumanMessage)
    assert result["tester_messages"][1] == tool_call_msg
    assert "Tester triggered tool: write_code_to_disk" in result["messages"][-1]

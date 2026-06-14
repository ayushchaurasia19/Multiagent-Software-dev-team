import pytest
from unittest.mock import MagicMock
from langchain_core.messages import AIMessage, HumanMessage

from src.agents.planner import plan_task
from src.agents.reviewer import review_code
from src.agents.backend_agent import write_backend_code
from src.agents.frontend_agent import write_frontend_code

def test_planner_agent(mocker):
    # Mock the LLM to return a JSON string
    mock_llm = mocker.patch("src.agents.planner.ChatGoogleGenerativeAI")
    mock_instance = mock_llm.return_value
    mock_instance.invoke.return_value = AIMessage(content='{"backend_tasks": ["Write API"], "frontend_tasks": ["Create UI"]}')

    state = {"requirements": "Build a simple app"}
    result = plan_task(state)

    assert result["backend_tasks"] == ["Write API"]
    assert result["frontend_tasks"] == ["Create UI"]
    assert "Planner created 1 backend and 1 frontend tasks." in result["messages"][-1]

def test_reviewer_agent(mocker):
    # Mock LLM to return review status
    mock_llm = mocker.patch("src.agents.reviewer.ChatGoogleGenerativeAI")
    mock_instance = mock_llm.return_value
    mock_instance.invoke.return_value = AIMessage(content='{"status": "revise", "feedback": ["Missing feature"]}')

    # Mock filesystem so the Reviewer isn't blind!
    mocker.patch("os.path.exists", return_value=True)
    mocker.patch("os.walk", return_value=[("/mock/workspace", [], ["test.py"])])
    
    # Mock open to return dummy python code
    mock_open = mocker.mock_open(read_data="print('hello')")
    mocker.patch("builtins.open", mock_open)

    state = {"requirements": "Build a simple app", "backend_tasks": ["Task 1"], "frontend_tasks": [], "review_count": 1}
    result = review_code(state)

    assert result["review_status"] == "revise"
    assert result["review_feedback"] == ["Missing feature"]
    assert result["review_count"] == 2
    assert result["backend_done"] is False
    assert result["frontend_done"] is False
    
def test_backend_agent(mocker):
    mock_llm_class = mocker.patch("src.agents.backend_agent.ChatGoogleGenerativeAI")
    mock_llm_instance = mock_llm_class.return_value
    
    mock_bound_llm = MagicMock()
    mock_llm_instance.bind_tools.return_value = mock_bound_llm
    
    tool_call_msg = AIMessage(
        content="", 
        tool_calls=[{"name": "write_code_to_disk", "args": {"filepath": "backend.py", "code": "print('hi')"}, "id": "call_1"}]
    )
    mock_bound_llm.invoke.return_value = tool_call_msg

    state = {
        "requirements": "Build a simple app", 
        "backend_tasks": ["Task 1"], 
        "review_status": "", 
        "review_feedback": [], 
        "review_count": 0, 
        "messages": [], 
        "backend_messages": []
    }
    result = write_backend_code(state)

    assert len(result["backend_messages"]) == 2
    assert isinstance(result["backend_messages"][0], HumanMessage)
    assert result["backend_messages"][1] == tool_call_msg
    assert "Backend triggered tool: write_code_to_disk" in result["messages"][-1]

def test_frontend_agent(mocker):
    mock_llm_class = mocker.patch("src.agents.frontend_agent.ChatGoogleGenerativeAI")
    mock_llm_instance = mock_llm_class.return_value
    
    mock_bound_llm = MagicMock()
    mock_llm_instance.bind_tools.return_value = mock_bound_llm
    
    tool_call_msg = AIMessage(
        content="", 
        tool_calls=[{"name": "write_code_to_disk", "args": {"filepath": "frontend.js", "code": "console.log('hi')"}, "id": "call_2"}]
    )
    mock_bound_llm.invoke.return_value = tool_call_msg

    state = {
        "requirements": "Build a simple app", 
        "frontend_tasks": ["Task 2"], 
        "review_status": "", 
        "review_feedback": [], 
        "review_count": 0, 
        "messages": [], 
        "frontend_messages": []
    }
    result = write_frontend_code(state)

    assert len(result["frontend_messages"]) == 2
    assert isinstance(result["frontend_messages"][0], HumanMessage)
    assert result["frontend_messages"][1] == tool_call_msg
    assert "Frontend triggered tool: write_code_to_disk" in result["messages"][-1]

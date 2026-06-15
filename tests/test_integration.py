# pyrefly: ignore [missing-import]
import pytest
import os
from langchain_core.messages import AIMessage
from src.graph.workflow import create_workflow

def test_full_pipeline_integration(mocker, tmp_path):
    # Mock workspace dir to prevent writing to real disk
    workspace_dir = tmp_path / "workspace"
    workspace_dir.mkdir()
    mocker.patch("os.getcwd", return_value=str(tmp_path))
    
    # Mock Planner LLM
    planner_llm = mocker.patch("src.agents.planner.ChatGoogleGenerativeAI")
    planner_llm.return_value.invoke.return_value = AIMessage(content='{"backend_tasks": ["task1"], "frontend_tasks": ["task2"]}')
    
    # Mock Backend LLM
    back_llm = mocker.patch("src.agents.backend_agent.ChatGoogleGenerativeAI")
    back_bound = mocker.MagicMock()
    back_llm.return_value.bind_tools.return_value = back_bound
    
    # Backend sequence: 1 tool call, then 1 text summary
    back_tool_msg = AIMessage(
        content="", 
        tool_calls=[{"name": "write_code_to_disk", "args": {"filepath": "backend.py", "code": "print('hello')"}, "id": "call_1"}]
    )
    back_summary_msg = AIMessage(content="Backend done.")
    back_bound.invoke.side_effect = [back_tool_msg, back_summary_msg]
    
    # Mock Frontend LLM
    front_llm = mocker.patch("src.agents.frontend_agent.ChatGoogleGenerativeAI")
    front_bound = mocker.MagicMock()
    front_llm.return_value.bind_tools.return_value = front_bound
    
    # Frontend sequence: 1 tool call, then 1 text summary
    front_tool_msg = AIMessage(
        content="", 
        tool_calls=[{"name": "write_code_to_disk", "args": {"filepath": "frontend.js", "code": "console.log('hello')"}, "id": "call_2"}]
    )
    front_summary_msg = AIMessage(content="Frontend done.")
    front_bound.invoke.side_effect = [front_tool_msg, front_summary_msg]
    
    # Mock Tester LLM
    tester_llm = mocker.patch("src.agents.tester.ChatGoogleGenerativeAI")
    tester_bound = mocker.MagicMock()
    tester_llm.return_value.bind_tools.return_value = tester_bound
    
    # Tester sequence: 1 tool call, then 1 text summary (JSON summary)
    tester_tool_msg = AIMessage(
        content="", 
        tool_calls=[{"name": "write_code_to_disk", "args": {"filepath": "tests/test_backend.py", "code": "def test_back(): pass"}, "id": "call_3"}]
    )
    tester_summary_msg = AIMessage(content='{"status": "passed", "issues": [], "summary": "All tests passed statically"}')
    tester_bound.invoke.side_effect = [tester_tool_msg, tester_summary_msg]
    
    # Mock Reviewer LLM
    rev_llm = mocker.patch("src.agents.reviewer.ChatGoogleGenerativeAI")
    rev_llm.return_value.invoke.return_value = AIMessage(content='{"status": "approved", "feedback": []}')
    
    # Compile and run
    app = create_workflow()
    
    inputs = {
        "requirements": "Test prompt",
        "backend_tasks": [],
        "frontend_tasks": [],
        "review_status": "",
        "review_feedback": [],
        "review_count": 0,
        "messages": [],
        "backend_messages": [],
        "frontend_messages": [],
        "tester_messages": [],
        "backend_done": False,
        "frontend_done": False,
        "tester_done": False,
        "test_report": ""
    }
    
    final_state = app.invoke(inputs)
    
    # Assertions
    assert final_state["backend_tasks"] == ["task1"]
    assert final_state["frontend_tasks"] == ["task2"]
    assert final_state["review_status"] == "approved"
    assert final_state["tester_done"] is True
    assert final_state["test_report"] == "All tests passed statically"
    assert (workspace_dir / "backend.py").exists()
    assert (workspace_dir / "backend.py").read_text() == "print('hello')"
    assert (workspace_dir / "frontend.js").exists()
    assert (workspace_dir / "frontend.js").read_text() == "console.log('hello')"
    assert (workspace_dir / "tests/test_backend.py").exists()
    assert (workspace_dir / "tests/test_backend.py").read_text() == "def test_back(): pass"


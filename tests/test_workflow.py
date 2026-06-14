import pytest
from langgraph.graph import END
from langchain_core.messages import AIMessage
from src.graph.workflow import (
    route_from_backend, 
    route_from_frontend, 
    route_from_join, 
    decide_next_node, 
    MAX_REVIEWS
)

def test_route_from_backend_to_tools():
    tool_call_msg = AIMessage(
        content="", 
        tool_calls=[{"name": "write_code_to_disk", "args": {"filepath": "backend.py", "code": "print('hi')"}, "id": "call_1"}]
    )
    state = {"backend_messages": [tool_call_msg]}
    assert route_from_backend(state) == "backend_tools"

def test_route_from_backend_done():
    text_msg = AIMessage(content="I am finished writing the backend code.")
    state = {"backend_messages": [text_msg]}
    assert route_from_backend(state) == "mark_backend_done"

def test_route_from_frontend_to_tools():
    tool_call_msg = AIMessage(
        content="", 
        tool_calls=[{"name": "write_code_to_disk", "args": {"filepath": "frontend.js", "code": "console.log('hi')"}, "id": "call_2"}]
    )
    state = {"frontend_messages": [tool_call_msg]}
    assert route_from_frontend(state) == "frontend_tools"

def test_route_from_frontend_done():
    text_msg = AIMessage(content="I am finished writing the frontend code.")
    state = {"frontend_messages": [text_msg]}
    assert route_from_frontend(state) == "mark_frontend_done"

def test_route_from_join():
    assert route_from_join({"backend_done": True, "frontend_done": True}) == "reviewer"
    assert route_from_join({"backend_done": True, "frontend_done": False}) == END
    assert route_from_join({"backend_done": False, "frontend_done": True}) == END
    assert route_from_join({"backend_done": False, "frontend_done": False}) == END

def test_decide_next_node_revise():
    state = {"review_status": "revise", "review_count": 1}
    assert decide_next_node(state) == "dispatch_revisions"

def test_decide_next_node_approved():
    state = {"review_status": "approved", "review_count": 1}
    assert decide_next_node(state) == END

def test_decide_next_node_max_reviews():
    state = {"review_status": "revise", "review_count": MAX_REVIEWS}
    assert decide_next_node(state) == END

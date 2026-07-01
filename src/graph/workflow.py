from langgraph.graph import StateGraph, END
from src.state import AgentState
from src.agents.planner import plan_task
from src.agents.backend_agent import write_backend_code
from src.agents.frontend_agent import write_frontend_code
from src.agents.reviewer import review_code
from src.agents.tester import run_tester_agent
from src.tools.file_tools import write_code_to_disk
from src.tools.exec_tools import run_pytest_suite
from src.tools.aws_tools import write_code_to_s3, run_pytest_suite_s3
from langchain_core.messages import ToolMessage
from langgraph.checkpoint.memory import MemorySaver
import json

memory = MemorySaver()

MAX_REVIEWS = 3

def _execute_tools_generic(messages, label):
    if not messages:
        return []
    last_msg = messages[-1]
    if not hasattr(last_msg, "tool_calls") or not last_msg.tool_calls:
        return []
        
    tool_results = []
    
    print("\n" + "="*50)
    print(f"  [TOOL EXECUTOR - {label}] is working...")
    print(f"   Tools called: {[call['name'] for call in last_msg.tool_calls]}")
    print("="*50)
    
    TOOL_MAP = {
        "write_code_to_disk": write_code_to_disk,
        "run_pytest_suite": run_pytest_suite,
        "write_code_to_s3": write_code_to_s3,
        "run_pytest_suite_s3": run_pytest_suite_s3
    }
    
    for call in last_msg.tool_calls:
        tool_name = call["name"]
        if tool_name in TOOL_MAP:
            args = call["args"]
            try:
                result_str = TOOL_MAP[tool_name].invoke(args)
            except Exception as e:
                result_str = f"Error executing tool: {e}"
                
            tool_msg = ToolMessage(content=result_str, tool_call_id=call["id"], name=tool_name)
            tool_results.append(tool_msg)
        else:
            tool_msg = ToolMessage(content=f"Error: Unknown tool {tool_name}", tool_call_id=call["id"], name=tool_name)
            tool_results.append(tool_msg)
            
    return tool_results

def execute_backend_tools(state: dict):
    results = _execute_tools_generic(state.get("backend_messages", []), "BACKEND")
    return {"backend_messages": results}

def execute_frontend_tools(state: dict):
    results = _execute_tools_generic(state.get("frontend_messages", []), "FRONTEND")
    return {"frontend_messages": results}

def execute_tester_tools(state: dict):
    results = _execute_tools_generic(state.get("tester_messages", []), "TESTER")
    return {"tester_messages": results}

def route_from_backend(state: dict):
    messages = state.get("backend_messages", [])
    if messages:
        last_msg = messages[-1]
        if hasattr(last_msg, "tool_calls") and last_msg.tool_calls:
            return "backend_tools"
    return "mark_backend_done"

def route_from_frontend(state: dict):
    messages = state.get("frontend_messages", [])
    if messages:
        last_msg = messages[-1]
        if hasattr(last_msg, "tool_calls") and last_msg.tool_calls:
            return "frontend_tools"
    return "mark_frontend_done"

def route_from_tester(state: dict):
    messages = state.get("tester_messages", [])
    if messages:
        last_msg = messages[-1]
        if hasattr(last_msg, "tool_calls") and last_msg.tool_calls:
            return "tester_tools"
    return "mark_tester_done"

def mark_backend_done(state: dict):
    return {"backend_done": True}

def mark_frontend_done(state: dict):
    return {"frontend_done": True}

def mark_tester_done(state: dict):
    messages = state.get("tester_messages", [])
    feedback = []
    report_summary = ""
    if messages:
        last_msg = messages[-1]
        content = str(last_msg.content).strip()
        # Parse JSON
        try:
            if content.startswith("```json"):
                content = content[7:-3].strip()
            elif content.startswith("```"):
                content = content[3:-3].strip()
            parsed = json.loads(content)
            feedback = parsed.get("issues", [])
            report_summary = parsed.get("summary", "")
        except Exception as e:
            report_summary = content
            if "error" in content.lower() or "fail" in content.lower():
                feedback = [f"[BACKEND] Tester found issues: {content}"]
                
    # Append tester issues to review_feedback
    current_feedback = list(state.get("review_feedback", []))
    for issue in feedback:
        if issue not in current_feedback:
            current_feedback.append(issue)
            
    return {
        "tester_done": True,
        "review_feedback": current_feedback,
        "test_report": report_summary
    }

def join_node(state: dict):
    # Dummy node to collect states
    return {}

def route_from_join(state: dict):
    if state.get("backend_done") and state.get("frontend_done") and state.get("tester_done"):
        return "reviewer"
    return END

def decide_next_node(state: dict):
    status = state.get("review_status", "approved")
    count = state.get("review_count", 0)
    
    if status == "revise" and count < MAX_REVIEWS:
        return "dispatch_revisions"
    return END

def create_workflow():
    workflow = StateGraph(AgentState)  # type: ignore
    
    workflow.add_node("planner", plan_task)
    workflow.add_node("backend_agent", write_backend_code)
    workflow.add_node("frontend_agent", write_frontend_code)
    workflow.add_node("tester_agent", run_tester_agent)
    workflow.add_node("backend_tools", execute_backend_tools)
    workflow.add_node("frontend_tools", execute_frontend_tools)
    workflow.add_node("tester_tools", execute_tester_tools)
    workflow.add_node("mark_backend_done", mark_backend_done)
    workflow.add_node("mark_frontend_done", mark_frontend_done)
    workflow.add_node("mark_tester_done", mark_tester_done)
    workflow.add_node("join_node", join_node)
    workflow.add_node("reviewer", review_code)
    
    # Dummy node to fan-out revisions to both agents
    workflow.add_node("dispatch_revisions", lambda state: {})
    
    workflow.set_entry_point("planner")
    
    # Fan-out from planner
    workflow.add_edge("planner", "backend_agent")
    workflow.add_edge("planner", "frontend_agent")
    
    # Backend Loop
    workflow.add_conditional_edges("backend_agent", route_from_backend, {"backend_tools": "backend_tools", "mark_backend_done": "mark_backend_done"})
    workflow.add_edge("backend_tools", "backend_agent")
    workflow.add_edge("mark_backend_done", "tester_agent")
    
    # Tester Loop
    workflow.add_conditional_edges("tester_agent", route_from_tester, {"tester_tools": "tester_tools", "mark_tester_done": "mark_tester_done"})
    workflow.add_edge("tester_tools", "tester_agent")
    workflow.add_edge("mark_tester_done", "join_node")
    
    # Frontend Loop
    workflow.add_conditional_edges("frontend_agent", route_from_frontend, {"frontend_tools": "frontend_tools", "mark_frontend_done": "mark_frontend_done"})
    workflow.add_edge("frontend_tools", "frontend_agent")
    workflow.add_edge("mark_frontend_done", "join_node")
    
    # Synchronization
    workflow.add_conditional_edges("join_node", route_from_join, {"reviewer": "reviewer", END: END})
    
    # Reviewer
    workflow.add_conditional_edges("reviewer", decide_next_node, {"dispatch_revisions": "dispatch_revisions", END: END})
    
    # Revision Fan-out
    workflow.add_edge("dispatch_revisions", "backend_agent")
    
    return workflow.compile(checkpointer=memory)

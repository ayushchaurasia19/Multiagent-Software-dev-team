from langgraph.graph import StateGraph, END
from src.state import AgentState
from src.agents.planner import plan_task
from src.agents.developer import write_code
from src.agents.reviewer import review_code
from src.tools.file_tools import write_code_to_disk
from langchain_core.messages import ToolMessage

MAX_REVIEWS = 3

def execute_tools(state: dict):
    agent_messages = state.get("agent_messages", [])
    if not agent_messages:
        return {}
    
    last_msg = agent_messages[-1]
    if not hasattr(last_msg, "tool_calls") or not last_msg.tool_calls:
        return {}
        
    tool_results = []
    log_messages = []
    for call in last_msg.tool_calls:
        if call["name"] == "write_code_to_disk":
            args = call["args"]
            try:
                result_str = write_code_to_disk.invoke(args)
            except Exception as e:
                result_str = f"Error executing tool: {e}"
                
            tool_msg = ToolMessage(content=result_str, tool_call_id=call["id"], name=call["name"])
            tool_results.append(tool_msg)
            log_messages.append(f"Tool Execution: {result_str}")
            
    return {"agent_messages": tool_results, "messages": state.get("messages", []) + log_messages}

def route_from_developer(state: dict):
    agent_messages = state.get("agent_messages", [])
    if agent_messages:
        last_msg = agent_messages[-1]
        if hasattr(last_msg, "tool_calls") and last_msg.tool_calls:
            return "tools"
    return "reviewer"

def decide_next_node(state: dict):
    status = state.get("review_status", "approved")
    count = state.get("review_count", 0)
    
    if status == "revise" and count < MAX_REVIEWS:
        return "developer"
    return END

def create_workflow():
    workflow = StateGraph(AgentState)  # type: ignore
    
    workflow.add_node("planner", plan_task)
    workflow.add_node("developer", write_code)
    workflow.add_node("tools", execute_tools)
    workflow.add_node("reviewer", review_code)
    
    workflow.set_entry_point("planner")
    workflow.add_edge("planner", "developer")
    
    workflow.add_conditional_edges("developer", route_from_developer, {"tools": "tools", "reviewer": "reviewer"})
    workflow.add_edge("tools", "developer")
    workflow.add_conditional_edges("reviewer", decide_next_node, {"developer": "developer", END: END})
    
    return workflow.compile()

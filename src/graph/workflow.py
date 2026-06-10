from langgraph.graph import StateGraph, END
from src.state import AgentState
from src.agents.planner import plan_task
from src.agents.developer import write_code
from src.agents.reviewer import review_code

MAX_REVIEWS = 1

def decide_next_node(state: dict):
    # Route logic for Reviewer loop
    status = state.get("review_status", "approved")
    count = state.get("review_count", 0)
    
    if status == "revise" and count < MAX_REVIEWS:
        return "developer"
    return END

def create_workflow():
    # Define the graph using our TypedDict state
    workflow = StateGraph(AgentState)  # type: ignore
    
    # Add nodes representing the agents
    workflow.add_node("planner", plan_task)
    workflow.add_node("developer", write_code)
    workflow.add_node("reviewer", review_code)
    
    # Define edges
    workflow.set_entry_point("planner")
    workflow.add_edge("planner", "developer")
    workflow.add_edge("developer", "reviewer")
    
    # Conditional edge from reviewer
    workflow.add_conditional_edges(
        "reviewer",
        decide_next_node,
        {
            "developer": "developer",
            END: END
        }
    )
    
    # Compile the graph
    app = workflow.compile()
    
    return app

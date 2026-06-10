from langchain_ollama import ChatOllama
from langchain_core.messages import SystemMessage, HumanMessage
import json

def plan_task(state: dict):
    # Using the single underlying model
    llm = ChatOllama(model="qwen2.5-coder", temperature=0)
    
    requirements = state.get("requirements", "")
    
    system_prompt = """You are a software development Planner Agent.
Your job is to read the requirements and break them down into an ordered list of tasks.
Return a valid JSON object with a single key 'tasks' which contains a list of string tasks.
Example: {"tasks": ["Design schema", "Write API"]}
Do not wrap your response in markdown blocks."""
    
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=f"Requirements: {requirements}")
    ]
    
    response = llm.invoke(messages)
    
    content = ""
    try:
        content_raw = response.content
        if isinstance(content_raw, list):
            content_raw = content_raw[0] if content_raw else ""
        content = str(content_raw).strip()
        # Failsafe: LLMs have a deep training bias to wrap outputs in markdown (```json).
        # We must strip these backticks, otherwise json.loads() will crash with a JSONDecodeError.
        if content.startswith("```json"):
            content = content[7:-3].strip()
        elif content.startswith("```"):
            content = content[3:-3].strip()
            
        parsed = json.loads(content)
        tasks = parsed.get("tasks", [])
    except Exception as e:
        tasks = [f"Failed to parse tasks. Raw content: {content}. Error: {e}"]

    # Update state
    if "messages" not in state:
        state["messages"] = []
        
    state_updates = {
        "tasks": tasks, 
        "messages": state["messages"] + [f"Planner created {len(tasks)} tasks."]
    }
    
    return state_updates

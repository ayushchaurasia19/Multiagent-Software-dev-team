import os
from langchain_groq import ChatGroq  # type: ignore
from langchain_core.messages import SystemMessage, HumanMessage
import json

def plan_task(state: dict):
    print("\n" + "="*50)
    print("[PLANNER AGENT] is analyzing requirements...")
    print(f"   Requirements: {state.get('requirements', '')[:60]}...")
    print("="*50)
    API_KEY = os.getenv("GROQ_API_KEY")

    # Using the single underlying model
    llm = ChatGroq(
        model="llama-3.3-70b-versatile",
        api_key=API_KEY,
        temperature=0,
        max_retries=5,
        timeout=60,
    )
    
    requirements = state.get("requirements", "")
    
    system_prompt = """You are a software development Planner Agent.
Your job is to read the requirements and break them down into an ordered list of tasks.
Categorize the tasks into 'backend_tasks' and 'frontend_tasks'.
Return a valid JSON object with two keys: 'backend_tasks' and 'frontend_tasks', each containing a list of string tasks.
Example: {"backend_tasks": ["Design schema", "Write API"], "frontend_tasks": ["Create UI component", "Connect to API"]}
Do not wrap your response in markdown blocks."""
    
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=f"Requirements: {requirements}")
    ]
    
    response = llm.invoke(messages)
    
    content = ""
    backend_tasks = []
    frontend_tasks = []
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
        backend_tasks = parsed.get("backend_tasks", [])
        frontend_tasks = parsed.get("frontend_tasks", [])
    except Exception as e:
        backend_tasks = [f"Failed to parse backend tasks. Raw content: {content}. Error: {e}"]
        frontend_tasks = []

    state_updates = {
        "backend_tasks": backend_tasks,
        "frontend_tasks": frontend_tasks,
        "messages": [f"Planner created {len(backend_tasks)} backend and {len(frontend_tasks)} frontend tasks."]
    }
    
    return state_updates

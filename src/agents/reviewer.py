from langchain_ollama import ChatOllama
from langchain_core.messages import SystemMessage, HumanMessage
import json

def review_code(state: dict):
    # Setup LLM
    llm = ChatOllama(model="qwen2.5-coder", temperature=0)
    
    requirements = state.get("requirements", "")
    tasks = state.get("tasks", [])
    code = state.get("code", "")
    review_count = state.get("review_count", 0)
    
    task_list_str = "\n".join([f"- {t}" for t in tasks])
    
    system_prompt = """You are a software Reviewer Agent.
Your job is to read the requirements, the tasks list, and the generated Python code, 
and evaluate if the code is complete, correct, and matches the requirements and tasks.

Determine if the code is approved or needs revision.
Return a valid JSON object with the following keys:
- "status": either "approved" or "revise"
- "feedback": a JSON array of strings containing specific issues found in the code, or an empty array if approved.

Example response when revision is required:
{
  "status": "revise",
  "feedback": [
    "Missing database table initialization logic.",
    "Error handling for borrow_book method is missing."
  ]
}

Example response when approved:
{
  "status": "approved",
  "feedback": []
}

Do not wrap your response in markdown blocks. Output only the raw JSON."""
    
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=f"Requirements: {requirements}\nTasks:\n{task_list_str}\n\nGenerated Code:\n{code}")
    ]
    
    response = llm.invoke(messages)
    
    content = ""
    try:
        content_raw = response.content
        if isinstance(content_raw, list):
            content_raw = content_raw[0] if content_raw else ""
        content = str(content_raw).strip()
        
        # Failsafe cleanup for markdown blocks
        if content.startswith("```json"):
            content = content[7:-3].strip()
        elif content.startswith("```"):
            content = content[3:-3].strip()
            
        parsed = json.loads(content)
        status = parsed.get("status", "revise")
        feedback = parsed.get("feedback", [])
        if not isinstance(feedback, list):
            feedback = [str(feedback)]
    except Exception as e:
        status = "revise"
        feedback = [f"Failed to parse reviewer feedback. Raw response: {content}. Error: {e}"]

    # Update state
    if "messages" not in state:
        state["messages"] = []
        
    state_updates = {
        "review_status": status,
        "review_feedback": feedback,
        "review_count": review_count + 1,
        "messages": state["messages"] + [f"Reviewer status: {status}. Found {len(feedback)} issues. Revision cycle: {review_count + 1}"]
    }
    
    return state_updates

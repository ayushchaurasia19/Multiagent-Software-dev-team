from langchain_ollama import ChatOllama
from langchain_core.messages import SystemMessage, HumanMessage

def write_code(state: dict):
    llm = ChatOllama(model="qwen2.5-coder", temperature=0.1)
    
    requirements = state.get("requirements", "")
    tasks = state.get("tasks", [])
    
    task_list_str = "\n".join([f"- {t}" for t in tasks])
    
    system_prompt = """You are a software Developer Agent.
Your job is to read the requirements and the task list, and write the corresponding code.
Output only the Python code. Do not wrap it in markdown code blocks like ```python. 
Just output the raw code."""
    
    review_status = state.get("review_status", "")
    review_feedback = state.get("review_feedback", [])
    previous_code = state.get("code", "")
    
    if review_status == "revise" and previous_code:
        feedback_str = "\n".join([f"- {item}" for item in review_feedback])
        human_content = f"""Requirements: {requirements}
Tasks:
{task_list_str}

The previous implementation was rejected by the reviewer with the following feedback/issues:
{feedback_str}

Here is the previous implementation:
```python
{previous_code}
```

Please revise and correct the implementation to address all feedback items.
Output the full corrected python code. Do not wrap the output in markdown code blocks like ```python. Just output the raw code."""
        msg_log = f"Developer revised code based on reviewer feedback ({len(review_feedback)} issues)."
    else:
        human_content = f"Requirements: {requirements}\nTasks:\n{task_list_str}\n\nPlease generate the code."
        msg_log = "Developer generated initial code."
    
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=human_content)
    ]
    
    response = llm.invoke(messages)
    content_raw = response.content
    if isinstance(content_raw, list):
        content_raw = content_raw[0] if content_raw else ""
    code = str(content_raw).strip()
    
    # Failsafe cleanup
    if code.startswith("```python"):
        code = code[9:-3].strip()
    elif code.startswith("```"):
         code = code[3:-3].strip()
         
    if "messages" not in state:
        state["messages"] = []
        
    state_updates = {
        "code": code, 
        "messages": state["messages"] + [msg_log]
    }
    
    return state_updates

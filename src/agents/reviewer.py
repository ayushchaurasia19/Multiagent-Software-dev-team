import os
from langchain_groq import ChatGroq  # type: ignore
from langchain_core.messages import SystemMessage, HumanMessage
import json

def review_code(state: dict):
    print("\n" + "="*50)
    print(" [REVIEWER AGENT] is evaluating the code...")
    print(f"   Review cycle: {state.get('review_count', 0) + 1}")
    print("="*50)
    API_KEY = os.getenv("GROQ_API_KEY")

    llm = ChatGroq(
        model="llama-3.3-70b-versatile",
        api_key=API_KEY,
        temperature=0,
        max_retries=5,
        timeout=60,
    )
    
    requirements = state.get("requirements", "")
    backend_tasks = state.get("backend_tasks", [])
    frontend_tasks = state.get("frontend_tasks", [])
    tasks = backend_tasks + frontend_tasks
    review_count = state.get("review_count", 0)
    
    # Read generated files from workspace
    workspace_dir = os.path.join(os.getcwd(), "workspace")
    code_contents = []
    if os.path.exists(workspace_dir):
        for root, _, files in os.walk(workspace_dir):
            for file in files:
                if file.endswith((".py", ".md", ".html", ".js", ".css", ".json")):
                    file_path = os.path.join(root, file)
                    try:
                        with open(file_path, "r", encoding="utf-8") as f:
                            content = f.read()
                        rel_path = os.path.relpath(file_path, workspace_dir)
                        code_contents.append(f"--- {rel_path} ---\n{content}\n")
                    except Exception:
                        pass
    code = "\n".join(code_contents)
    if not code.strip():
        code = "(No code files found in workspace)"
    
    task_list_str = "\n".join([f"- {t}" for t in tasks])
    
    system_prompt = """You are a software Reviewer Agent.
    Your job is to read the requirements, the tasks list, the generated code (including the unit tests and test report under `tests/`), 
    and evaluate if the codebase is complete, correct, matches requirements/tasks, and has a valid, passing test suite.

    Verify that:
    1. The main application files meet all user requirements.
    2. The generated test files cover essential functionality and edge cases.
    3. The test report does not highlight unresolved critical issues.

    Determine if the codebase is approved or needs revision.
    Return a valid JSON object with the following keys:
    - "status": either "approved" or "revise"
    - "feedback": a JSON array of strings containing specific issues found in the code/tests, or an empty array if approved.

    CRITICAL: For every feedback string, you MUST prefix it with either [BACKEND] or [FRONTEND] to indicate which agent needs to fix it. If tests are missing, broken, or inadequate, tag them with [BACKEND].

    Example response when revision is required:
    {
    "status": "revise",
    "feedback": [
        "[BACKEND] Missing database table initialization logic in models.py.",
        "[BACKEND] Unit tests in tests/test_api.py are missing coverage for delete endpoints.",
        "[FRONTEND] The submit button on index.html is missing."
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
        "messages": [f"Reviewer status: {status}. Found {len(feedback)} issues. Revision cycle: {review_count + 1}"]
    }
    
    if status == "revise":
        state_updates["backend_done"] = False
        state_updates["frontend_done"] = False
        state_updates["tester_done"] = False
    
    return state_updates

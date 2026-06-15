from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage, BaseMessage
from src.tools.file_tools import write_code_to_disk
import os

def run_tester_agent(state: dict):
    print("\n" + "="*50)
    print(" [TESTER AGENT] is writing tests and checking code...")
    print("="*50)
    
    llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash-lite", temperature=0, max_retries=10)
    llm_with_tools = llm.bind_tools([write_code_to_disk])
    
    requirements = state.get("requirements", "")
    tasks = state.get("backend_tasks", [])
    agent_messages = state.get("tester_messages", [])
    
    # Read generated backend files from workspace to provide context
    workspace_dir = os.path.join(os.getcwd(), "workspace")
    backend_code_contents = []
    if os.path.exists(workspace_dir):
        for root, _, files in os.walk(workspace_dir):
            # Only focus on backend-specific files or files likely created by backend agent
            for file in files:
                if file.endswith((".py", ".json")):
                    file_path = os.path.join(root, file)
                    try:
                        with open(file_path, "r", encoding="utf-8") as f:
                            content = f.read()
                        rel_path = os.path.relpath(file_path, workspace_dir)
                        backend_code_contents.append(f"--- {rel_path} ---\n{content}\n")
                    except Exception:
                        pass
    backend_code = "\n".join(backend_code_contents)
    if not backend_code.strip():
        backend_code = "(No backend code files found in workspace)"

    system_prompt = """You are a QA/Tester Agent. Your focus is strictly on verifying the Backend Agent's code.
    Your job is to read the requirements, backend tasks, the generated backend code, and:
    1. Write a complete pytest test suite in `tests/test_api.py` (or corresponding test files for other backend files on disk) using the `write_code_to_disk` tool. Ensure the tests cover success paths, failure paths, and edge cases.
    2. Write a testing summary report to `tests/test_report.md` using the `write_code_to_disk` tool, describing your test coverage and any issues found.
    3. Once all files are written, output a final JSON block summarizing your findings. The JSON must have the following keys:
    - "status": either "passed" or "failed"
    - "issues": a list of specific issues/bugs/missing test coverage found in the backend code, each prefixed with "[BACKEND]" (e.g., "[BACKEND] API lacks input validation on user registration"). If no issues are found, this list must be empty.
    - "summary": a brief text summary of the verification.

    CRITICAL INSTRUCTIONS:
    - You MUST use the `write_code_to_disk` tool to write the test files and the report BEFORE outputting the JSON.
    - DO NOT provide the JSON summary until you have called the `write_code_to_disk` tool and received a 'File written successfully' message back.
    - Only output the final JSON block when you have completed all tool calls and written all files.
    - Do NOT wrap the final JSON block in markdown backticks (e.g. ```json) in your final text response. Just output the raw JSON string.
    - Focus strictly on the backend code verification. Do not test frontend assets.
    """

    messages_to_pass: list[BaseMessage] = [SystemMessage(content=system_prompt)]
    messages_to_pass.extend(agent_messages)
    
    new_agent_messages = []
    
    # Inject instructions if starting fresh or starting a new revision cycle
    if not agent_messages or (isinstance(agent_messages[-1], AIMessage) and not agent_messages[-1].tool_calls):
        task_list_str = "\n".join(f"- {t}" for t in tasks)
        
        # Include current feedback if we are in a revision cycle to guide regeneration
        feedback_context = ""
        if state.get("review_status") == "revise":
            feedback_str = "\n".join(f"- {item}" for item in state.get("review_feedback", []))
            feedback_context = f"\nPrevious review/test feedback:\n{feedback_str}"
            
        human_content = f"Requirements: {requirements}\nBackend Tasks:\n{task_list_str}{feedback_context}\n\nGenerated Backend Code:\n{backend_code}\n\nPlease generate the test files and test report using your tool, then provide the final JSON summary."
        
        instruction_msg = HumanMessage(content=human_content)
        messages_to_pass.append(instruction_msg)
        new_agent_messages.append(instruction_msg)
        
    response = llm_with_tools.invoke(messages_to_pass)
    new_agent_messages.append(response)
    
    if hasattr(response, "tool_calls") and response.tool_calls:
        msg_log = f"Tester triggered tool: {response.tool_calls[0]['name']}"
    else:
        msg_log = f"Tester generated final summary: {str(response.content)[:100].replace('\n', ' ')}..."
        
    return {
        "tester_messages": new_agent_messages,
        "messages": [msg_log]
    }

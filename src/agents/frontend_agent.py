from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage, BaseMessage
from src.tools.file_tools import write_code_to_disk

def write_frontend_code(state: dict):
    print("\n" + "="*50)
    print(" [FRONTEND AGENT] is writing code...")
    print("="*50)
    
    llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash-lite", temperature=0.1, max_retries=10)
    llm_with_tools = llm.bind_tools([write_code_to_disk])
    
    tasks = state.get("frontend_tasks", [])
    agent_messages = state.get("frontend_messages", [])
    
    system_prompt = """You are a Frontend Developer Agent. Focus on UI/UX, responsive design, and consuming APIs.
Your job is to read the requirements and the task list, and implement the project files.
CRITICAL INSTRUCTION: You MUST use the `write_code_to_disk` tool to create the files. 
Do NOT output code blocks in your text response. You MUST call the tool to write the code.
Write one file at a time. After calling the tool, wait for the success message before calling it again.
If you are in a revision cycle, ONLY write code if the reviewer feedback explicitly contains [FRONTEND] items. If the feedback is entirely for [BACKEND], do not use tools, just return a text summary saying no frontend changes are needed.
Once ALL files are written (or if no changes are needed), return a text summary to finish."""

    messages_to_pass: list[BaseMessage] = [SystemMessage(content=system_prompt)]
    messages_to_pass.extend(agent_messages)
        
    new_agent_messages = []
    
    # Inject instructions if starting fresh or starting a new revision cycle
    if not agent_messages or (isinstance(agent_messages[-1], AIMessage) and not agent_messages[-1].tool_calls):
        if state.get("review_status") == "revise" and agent_messages:
            feedback_str = "\n".join(f"- {item}" for item in state.get("review_feedback", []))
            human_content = f"The reviewer rejected the implementation with these issues:\n{feedback_str}\n\nPlease fix them using your tool."
        else:
            task_list_str = "\n".join(f"- {t}" for t in tasks)
            human_content = f"Requirements: {state.get('requirements', '')}\nTasks:\n{task_list_str}\n\nPlease generate the code files using your tool."
            
        instruction_msg = HumanMessage(content=human_content)
        messages_to_pass.append(instruction_msg)
        new_agent_messages.append(instruction_msg)
    
    response = llm_with_tools.invoke(messages_to_pass)
    new_agent_messages.append(response)
    
    if hasattr(response, "tool_calls") and response.tool_calls:
        msg_log = f"Frontend triggered tool: {response.tool_calls[0]['name']}"
    else:
        msg_log = f"Frontend generated final text summary: {str(response.content)[:100].replace('\n', ' ')}..."
    
    return {
        "frontend_messages": new_agent_messages, 
        "messages": [msg_log]
    }

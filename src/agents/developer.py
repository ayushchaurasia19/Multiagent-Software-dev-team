from langchain_ollama import ChatOllama
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage, BaseMessage
from src.tools.file_tools import write_code_to_disk

def write_code(state: dict):
    llm = ChatOllama(model="qwen2.5-coder", temperature=0.1)
    llm_with_tools = llm.bind_tools([write_code_to_disk])
    
    requirements = state.get("requirements", "")
    tasks = state.get("tasks", [])
    review_status = state.get("review_status", "")
    review_feedback = state.get("review_feedback", [])
    agent_messages = state.get("agent_messages", [])
    
    task_list_str = "\n".join([f"- {t}" for t in tasks])
    
    system_prompt = """You are a software Developer Agent.
Your job is to read the requirements and the task list, and implement the project files.
CRITICAL INSTRUCTION: You MUST use the `write_code_to_disk` tool to create the files. 
Do NOT output code blocks in your text response. You MUST call the tool to write the code.
Write one file at a time. After calling the tool, wait for the success message before calling it again.
Once ALL files are written, return a text summary to finish."""

    messages_to_pass: list[BaseMessage] = [SystemMessage(content=system_prompt)]
    
    # Include conversational history
    if agent_messages:
        messages_to_pass.extend(agent_messages)
        
    # Check if we need to inject a new instruction (either very first run, or starting a revision cycle)
    needs_instructions = False
    if not agent_messages:
        needs_instructions = True
    else:
        last_msg = agent_messages[-1]
        # If the last message was the developer's final text summary (no tool calls), 
        # and we are back in this node, it means the reviewer sent us back for a revision.
        if isinstance(last_msg, AIMessage) and not last_msg.tool_calls:
            needs_instructions = True

    if needs_instructions:
        if review_status == "revise" and agent_messages:
            feedback_str = "\n".join([f"- {item}" for item in review_feedback])
            human_content = f"""The reviewer rejected the implementation with the following specific issues:
{feedback_str}

Please use your `write_code_to_disk` tool to overwrite the faulty files or create new ones to address all feedback items."""
        else:
            human_content = f"Requirements: {requirements}\nTasks:\n{task_list_str}\n\nPlease generate the code files using your tool."
        
        messages_to_pass.append(HumanMessage(content=human_content))
    
    import json
    # Invoke the model
    response = llm_with_tools.invoke(messages_to_pass)
    
    # HOTFIX: Manual Tool Parsing for Local LLMs
    # Sometimes local models output the tool call as raw JSON text instead of using the API
    if not response.tool_calls and isinstance(response.content, str):
        content_str = response.content.strip()
        if content_str.startswith("```json"):
            content_str = content_str[7:-3].strip()
        elif content_str.startswith("```"):
            content_str = content_str[3:-3].strip()
            
        try:
            parsed = json.loads(content_str)
            if isinstance(parsed, dict) and "name" in parsed and "arguments" in parsed:
                response.tool_calls = [{
                    "name": parsed["name"],
                    "args": parsed["arguments"],
                    "id": "call_manual_1",
                    "type": "tool_call"
                }]
        except json.JSONDecodeError:
            pass
    
    # Tool Enforcement Retry Loop
    # If the model didn't call a tool, and it hasn't called any tools in this session yet,
    # it probably hallucinated raw text instead of using its tools. We force it to retry.
    has_used_tools = any(hasattr(m, "tool_calls") and m.tool_calls for m in agent_messages)
    retries = 0
    while not response.tool_calls and not has_used_tools and retries < 2:
        messages_to_pass.append(response)
        messages_to_pass.append(HumanMessage(content="CRITICAL ERROR: You did not call the `write_code_to_disk` tool. You MUST call the tool to write the files. Do not just output text."))
        response = llm_with_tools.invoke(messages_to_pass)
        retries += 1
    
    if "messages" not in state:
        state["messages"] = []
        
    if response.tool_calls:
        msg_log = f"Developer triggered tool: {response.tool_calls[0]['name']}"
    else:
        # We also log the content so we can debug what it actually said if it failed again
        content_preview = str(response.content)[:100].replace('\n', ' ')
        msg_log = f"Developer generated final text summary: {content_preview}..."
    
    # We must append the HumanMessage instruction to agent_messages if we created one, 
    # so that the ToolNode and future loops have the correct history.
    new_agent_messages = []
    if needs_instructions:
        # Let's safely find the instruction we injected:
        instruction_msg = [m for m in messages_to_pass if isinstance(m, HumanMessage)][-1 - retries]
        new_agent_messages.append(instruction_msg)
        
    new_agent_messages.append(response) # The AIMessage
    
    state_updates = {
        "agent_messages": new_agent_messages, 
        "messages": state["messages"] + [msg_log]
    }
    
    return state_updates

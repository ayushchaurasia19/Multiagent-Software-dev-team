from typing import List, Annotated, Sequence
from typing_extensions import TypedDict
from pydantic import BaseModel, Field
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages

class AgentState(TypedDict):
    requirements: str
    tasks: List[str]
    code: str
    review_status: str          # 'approved' or 'revise'
    review_feedback: List[str]  # structured list of issues
    review_count: int           # loop iteration counter
    messages: List[str]         # for debug/logging
    agent_messages: Annotated[Sequence[BaseMessage], add_messages] # For ToolNode conversation

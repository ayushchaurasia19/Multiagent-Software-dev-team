from typing import List, Annotated, Sequence
from typing_extensions import TypedDict
from pydantic import BaseModel, Field
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages

import operator

class AgentState(TypedDict):
    requirements: str
    backend_tasks: List[str]
    frontend_tasks: List[str]
    review_status: str          # 'approved' or 'revise'
    review_feedback: List[str]  # structured list of issues
    review_count: int           # loop iteration counter
    messages: Annotated[List[str], operator.add] # for debug/logging
    backend_messages: Annotated[Sequence[BaseMessage], add_messages]
    frontend_messages: Annotated[Sequence[BaseMessage], add_messages]
    backend_done: bool
    frontend_done: bool

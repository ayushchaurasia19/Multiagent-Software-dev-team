from typing import List
from typing_extensions import TypedDict
from pydantic import BaseModel, Field

class AgentState(TypedDict):
    requirements: str
    tasks: List[str]
    code: str
    review_status: str          # 'approved' or 'revise'
    review_feedback: List[str]  # structured list of issues
    review_count: int           # loop iteration counter
    messages: List[str]         # for debug/logging

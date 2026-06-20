import os
import subprocess
from langchain_core.tools import tool
from pydantic import BaseModel, Field

class RunPytestInput(BaseModel):
    test_dir: str = Field(
        default="tests/", 
        description="The directory within the workspace to run pytest against. Defaults to 'tests/'."
    )

@tool("run_pytest_suite", args_schema=RunPytestInput)
def run_pytest_suite(test_dir: str = "tests/") -> str:
    """
    Executes the pytest test suite in the project workspace.
    Returns the stdout and stderr (including tracebacks) from the pytest execution.
    Call this tool to verify the correctness of the generated backend code.
    """
    workspace_dir = os.path.join(os.getcwd(), "workspace")
    
    # Ensure workspace exists
    if not os.path.exists(workspace_dir):
        return "Error: workspace directory does not exist."
        
    try:
        # Run pytest inside the workspace directory
        result = subprocess.run(
            ["pytest", test_dir],
            cwd=workspace_dir,
            capture_output=True,
            text=True
        )
        
        output = f"Exit Code: {result.returncode}\n\nSTDOUT:\n{result.stdout}\n\nSTDERR:\n{result.stderr}"
        return output
    except Exception as e:
        return f"Error executing pytest: {str(e)}"

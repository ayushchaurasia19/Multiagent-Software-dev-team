import os
from langchain_core.tools import tool
from pydantic import BaseModel, Field

class WriteCodeInput(BaseModel):
    filepath: str = Field(description="The relative file path where the code should be saved, e.g., 'backend/app.py' or 'index.html'. Do not use absolute paths.")
    code: str = Field(description="The raw code content to write to the file. Do NOT wrap this in markdown code blocks.")

@tool("write_code_to_disk", args_schema=WriteCodeInput)
def write_code_to_disk(filepath: str, code: str) -> str:
    """
    Writes the provided code to a file on disk within the project workspace.
    Automatically creates any missing parent directories.
    Call this tool iteratively to build the project files.
    """
    workspace_dir = os.path.join(os.getcwd(), "workspace")
    full_path = os.path.abspath(os.path.join(workspace_dir, filepath))
    
    # Security constraint: ensure it stays inside workspace/
    if not full_path.startswith(workspace_dir):
        return f"Error: Cannot write outside of the workspace directory. Tried to write to {full_path}"
        
    try:
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, "w", encoding="utf-8") as f:
            f.write(code)
        return f"Successfully wrote {len(code)} characters to {filepath}"
    except Exception as e:
        return f"Error writing file {filepath}: {str(e)}"

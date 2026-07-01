import os
import subprocess
import boto3
from langchain_core.tools import tool
from pydantic import BaseModel, Field

# Initialize boto3 client conditionally to avoid local credential errors if not set
try:
    s3_client = boto3.client('s3')
except Exception:
    s3_client = None

class WriteCodeS3Input(BaseModel):
    filepath: str = Field(description="The relative file path where the code should be saved, e.g., 'backend/app.py' or 'index.html'. Do not use absolute paths.")
    code: str = Field(description="The raw code content to write to the file. Do NOT wrap this in markdown code blocks.")

@tool("write_code_to_s3", args_schema=WriteCodeS3Input)
def write_code_to_s3(filepath: str, code: str) -> str:
    """
    Writes the provided code to an S3 bucket (for persistent storage) and to the local /tmp directory (for Lambda execution).
    Automatically creates any missing parent directories in /tmp.
    Call this tool iteratively to build the project files.
    """
    bucket = os.getenv("S3_WORKSPACE_BUCKET", "default-workspace-bucket")
    
    # In AWS Lambda, we can only write to /tmp
    tmp_workspace = os.path.join("/tmp", "workspace")
    full_path = os.path.abspath(os.path.join(tmp_workspace, filepath))
    
    if not full_path.startswith(tmp_workspace):
        return f"Error: Cannot write outside of the /tmp/workspace directory. Tried to write to {full_path}"
        
    try:
        # Write to /tmp for Lambda execution
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, "w", encoding="utf-8") as f:
            f.write(code)
            
        # Write to S3 for persistent artifact storage
        if s3_client and os.getenv("AWS_REGION"):
            s3_client.put_object(
                Bucket=bucket,
                Key=f"workspace/{filepath}",
                Body=code.encode('utf-8')
            )
            s3_status = f"S3 ({bucket})"
        else:
            s3_status = "S3 (Mocked - No AWS Credentials)"
            
        return f"Successfully wrote {len(code)} characters to {s3_status} and /tmp/workspace/{filepath}"
    except Exception as e:
        return f"Error writing file {filepath}: {str(e)}"

class RunPytestS3Input(BaseModel):
    test_dir: str = Field(
        default="tests/", 
        description="The directory within the workspace to run pytest against. Defaults to 'tests/'."
    )

@tool("run_pytest_suite_s3", args_schema=RunPytestS3Input)
def run_pytest_suite_s3(test_dir: str = "tests/") -> str:
    """
    Executes the pytest test suite in the /tmp workspace directory on AWS Lambda.
    Returns the stdout and stderr (including tracebacks) from the pytest execution.
    Call this tool to verify the correctness of the generated backend code.
    """
    tmp_workspace = os.path.join("/tmp", "workspace")
    
    # Ensure workspace exists
    if not os.path.exists(tmp_workspace):
        return "Error: /tmp/workspace directory does not exist. You must write code first."
        
    try:
        # Run pytest inside the /tmp/workspace directory using python -m to avoid PATH issues in Lambda
        result = subprocess.run(
            ["python", "-m", "pytest", test_dir],
            cwd=tmp_workspace,
            capture_output=True,
            text=True
        )
        
        output = f"Exit Code: {result.returncode}\n\nSTDOUT:\n{result.stdout}\n\nSTDERR:\n{result.stderr}"
        return output
    except Exception as e:
        return f"Error executing pytest: {str(e)}"

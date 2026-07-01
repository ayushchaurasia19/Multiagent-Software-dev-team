# AWS Integration Features

This project utilizes a robust suite of AWS features designed to enable the autonomous Multi-Agent Software Development Team to operate natively within serverless environments, specifically AWS Lambda, while ensuring high durability of the generated codebases.

## Architectural Adaptability

Traditional local file system access is heavily restricted within serverless architectures. The system intelligently detects the execution environment via the `DEPLOYMENT_ENV` variable. When operating in AWS mode, the agents transparently shift their underlying tool bindings from local filesystem interactions to cloud-native utilities.

### 1. Serverless File Management

When deployed to AWS Lambda, standard file writing is forbidden outside of the `/tmp` directory. To bypass this limitation seamlessly:
- **`write_code_to_s3` Tool:** Replaces the local `write_code_to_disk` utility. This tool enforces directory constraints, automatically rewriting the agents' target output paths to be nested under `/tmp/workspace/`.
- This ensures the LLM agents can construct multi-file applications dynamically without triggering file-permission errors inside the Lambda runtime container.

### 2. Persistent Artifact Backup via S3

AWS Lambda instances are ephemeral; any files stored in `/tmp` are lost when the function container spins down. To solve for data persistence:
- The `write_code_to_s3` tool uses the **Boto3** AWS SDK to dual-write every generated file.
- As the code is written to the local `/tmp/workspace`, an exact copy is simultaneously pushed to the Amazon S3 bucket defined in `S3_WORKSPACE_BUCKET`.
- This creates an iterative, real-time cloud backup of the project codebase as the AI engineers build it, preventing data loss across Lambda cold starts or container terminations.

### 3. Serverless Code Execution and QA

Code generation is only half the battle; the system relies heavily on the Tester Agent to verify implementation through continuous testing.
- **`run_pytest_suite_s3` Tool:** Tests cannot be run effectively if the environment limits process spawning or lacks context. This tool invokes the `pytest` module directly on the `/tmp/workspace/tests/` directory within the Lambda runtime.
- It robustly captures standard output (`stdout`) and standard error (`stderr`), returning the raw tracebacks to the LLM. This enables the Tester Agent to read failure states, interpret error stacks, and construct highly targeted feedback loops for the Backend Agent, all without leaving the AWS ecosystem.

### 4. Transparent Dashboard S3 Integration

The FastAPI backend server (`src/server.py`) has been upgraded to automatically detect the AWS environment. When active, it proxies workspace exploration endpoints (`/api/workspace` and `/api/workspace/file`) directly to the configured S3 bucket. This ensures the React frontend dashboard can continue to render the live workspace tree and file contents seamlessly, without requiring the generated files to exist on the server's local block storage.

## Setup Requirements

To enable these features, configure the following in your `.env` or AWS Parameter Store:

- `DEPLOYMENT_ENV=AWS`: Activates the cloud-native toolset.
- `S3_WORKSPACE_BUCKET`: The destination bucket for codebase artifacts.
- Valid IAM Roles or AWS credentials (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`) ensuring `s3:PutObject` permissions.

> [!IMPORTANT]
> The system handles boto3 instantiation gracefully. If AWS credentials are not found in the environment, the tool falls back to a mocked state for S3 uploads while still maintaining the `/tmp/workspace` constraints, ensuring local debugging remains possible even with AWS features enabled.

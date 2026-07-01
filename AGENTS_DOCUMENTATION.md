# Agents Documentation

This document explains the roles, responsibilities, configurations, and output formats of each AI agent and specialized node in the LangGraph workflow. The system is designed to simulate a miniature software development team working together to build out an application via parallel execution.

---

## 1. Planner Agent (`src/agents/planner.py`)
*   **Role:** Project Manager / System Architect
*   **Purpose:** Takes the user's raw, high-level requirements and breaks them down into two structured lists of actionable programming tasks.
*   **Inputs:** `requirements` (from the state).
*   **Outputs & State Updates:**
    *   Updates `backend_tasks` (list of strings) in the graph state.
    *   Updates `frontend_tasks` (list of strings) in the graph state.
    *   Appends a completion log message to `messages`.
*   **Output Format (LLM):** A raw, non-markdown-wrapped JSON string matching the schema:
    ```json
    {
      "backend_tasks": ["string", "string", ...],
      "frontend_tasks": ["string", "string", ...]
    }
    ```

---

## 2. Backend Agent & Frontend Agent (`src/agents/backend_agent.py`, `src/agents/frontend_agent.py`)
*   **Role:** Specialized Core Programmers (running in parallel)
*   **Purpose:** Operating on parallel branches, the Backend agent implements API endpoints, business logic, and databases. The Frontend agent implements the UI, styles, and api connections.
*   **Outputs & State Updates:**
    *   Writes physical files (e.g., `.py`, `.js`, `.html`, `.css`, `.json`) into the `workspace/` directory using the `write_code_to_disk` tool. If `DEPLOYMENT_ENV="AWS"`, utilizes the `write_code_to_s3` tool to write to `/tmp/workspace` for AWS Lambda compatibility and backup to an S3 bucket.
    *   Appends the interaction messages to `backend_messages` or `frontend_messages` state history lists.
*   **Output Format (LLM/Tool):**
    *   **During code generation:** Iteratively calls the tool `write_code_to_disk` (or `write_code_to_s3` on AWS) with argument formats:
        *   `filepath`: `string` (relative path to workspace)
        *   `code` / `content`: `string` (complete source code)
    *   **Upon completion:** Returns a plain text status/summary message.
    *   **In a revision cycle with no domain tasks:** Returns a text summary explaining that no changes are needed for its domain.

---

## 3. Tester Agent (`src/agents/tester.py`)
*   **Role:** QA Automation Engineer
*   **Purpose:** Analyzes the generated backend code, writes unit test suites, generates a test coverage report, and runs checks to identify edge cases or bugs.
*   **Outputs & State Updates:**
    *   Writes unit test suites (e.g. `tests/test_api.py`) and a markdown report (`tests/test_report.md`) to the workspace using the `write_code_to_disk` tool (or `write_code_to_s3` on AWS).
    *   Appends messages to `tester_messages` and a status log to `messages`.
*   **Output Format (LLM/Tool):**
    *   **During test generation:** Calls the `write_code_to_disk` (or `write_code_to_s3`) tool to output files.
    *   **During test execution:** Calls the `run_pytest_suite` (or `run_pytest_suite_s3`) tool to execute the tests and retrieve tracebacks.
    *   **Upon completion:** Returns a raw, non-markdown-wrapped JSON summary string of the verification results matching the schema:
        ```json
        {
          "status": "passed" | "failed",
          "issues": ["[BACKEND] issue string 1", ...],
          "summary": "string"
        }
        ```

---

## 4. Tool Executor Nodes (`src/graph/workflow.py`)
*   **Role:** The Bridge (Environment Simulator)
*   **Purpose:** Non-AI utility nodes executing the tool calls (e.g., `write_code_to_disk`, `write_code_to_s3`, `run_pytest_suite`, `run_pytest_suite_s3`) requested by the Backend, Frontend, or Tester agents.
*   **Outputs & State Updates:** 
    *   Appends a `ToolMessage` with the tool execution result (e.g., success, error status, or pytest stdout/stderr) back to the corresponding agent's message history.

---

## 5. Reviewer Agent (`src/agents/reviewer.py`)
*   **Role:** QA Lead / Code Reviewer
*   **Purpose:** Inspects requirements, lists of tasks, all generated codebase files, and test files/reports to determine whether to approve the codebase or request revisions.
*   **Outputs & State Updates:**
    *   Updates `review_status` (string: `"approved"` or `"revise"`).
    *   Updates `review_feedback` (list of strings).
    *   Increments `review_count` (integer).
    *   If `review_status` is `"revise"`, resets `backend_done`, `frontend_done`, and `tester_done` to `False` to re-trigger the coding loop.
*   **Output Format (LLM):** A raw, non-markdown-wrapped JSON string matching the schema:
    ```json
    {
      "status": "approved" | "revise",
      "feedback": ["[BACKEND] feedback message", "[FRONTEND] feedback message", ...]
    }
    ```

---

## 6. LangGraph Edge Router & Orchestration (`src/graph/workflow.py`)
*   **Role:** The Orchestrator
*   **Purpose:** Governs the parallel/sequential execution flow of the graph state machine, synchronization barriers, and revision loops.


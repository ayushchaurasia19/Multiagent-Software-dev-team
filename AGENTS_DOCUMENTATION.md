# Agents Documentation

This document explains the roles, responsibilities, and configurations of each AI agent and specialized node in the LangGraph workflow. The system is designed to simulate a miniature software development team working together to build out an application via parallel execution.

---

## 1. Planner Agent (`src/agents/planner.py`)
*   **Role:** Project Manager / System Architect
*   **Purpose:** Takes the user's raw, high-level requirements and breaks them down into two structured lists of actionable programming tasks: backend tasks and frontend tasks.
*   **Inputs:** `requirements` (from the state).
*   **Outputs:** Updates the `backend_tasks` and `frontend_tasks` lists.
*   **AI Model Configuration:** Uses `gemini-3.5-flash` with a temperature of `0` to ensure the breakdown is highly deterministic, logical, and formatted correctly as JSON without creative hallucinations.

---

## 2. Backend Agent & Frontend Agent (`src/agents/backend_agent.py`, `src/agents/frontend_agent.py`)
*   **Role:** Specialized Core Programmers
*   **Purpose:** The workhorses of the system. They operate **in parallel**. The Backend agent focuses strictly on APIs, logic, and databases. The Frontend agent focuses strictly on UI/UX and API consumption.
*   **How it works (Tool Binding):** Both agents bind the `write_code_to_disk` Python tool to their context. Instead of guessing how to structure the output, they actively invoke this tool to generate physical files in the `workspace/` directory.
*   **Smart Revision Filtering:** During a revision cycle, these agents read the Reviewer's feedback. They are specifically instructed via their system prompts to ignore feedback not tagged for their domain (e.g., `[BACKEND]` or `[FRONTEND]`). If no relevant feedback exists, they immediately go back to sleep.
*   **AI Model Configuration:** Uses `gemini-3.5-flash` with a temperature of `0.1`. A slight bump in temperature allows minimal creativity needed for writing clean code and solving logic problems.

---

## 3. Tool Executor Nodes (`src/graph/workflow.py`)
*   **Role:** The Bridge (Environment Simulator)
*   **Purpose:** These are not AI models, but critical LangGraph execution nodes. We maintain isolated tool nodes (`backend_tools` and `frontend_tools`) to ensure state isolation. When an agent outputs a tool call, the respective tool node catches it, runs the underlying Python function (`write_code_to_disk`), and returns the OS success/error string back to the specific agent's message history.

---

## 4. Reviewer Agent (`src/agents/reviewer.py`)
*   **Role:** QA Engineer / Code Reviewer
*   **Purpose:** Evaluates the generated files against the original requirements and the task lists to ensure the job is complete, functional, and bug-free.
*   **Outputs:** Updates the `review_status` state to either `"approved"` or `"revise"`. If revision is needed, it populates the `review_feedback` state list.
*   **Domain Tagging:** It is strictly instructed via a `CRITICAL` system prompt to prefix every single feedback string with `[BACKEND]` or `[FRONTEND]` so the parallel agents know exactly who is responsible for fixing the bug.
*   **AI Model Configuration:** Uses `gemini-3.5-flash` with a temperature of `0` to ensure strict, ruthless, and logical evaluations.

---

## 5. LangGraph Edge Router & Orchestration (`src/graph/workflow.py`)
*   **Role:** The Orchestrator
*   **Purpose:** Governs the flow of the entire application via parallel fan-out and fan-in routing.
*   **The Pipeline:**
    1.  Starts at **Planner**.
    2.  Fans out unconditionally to **Backend Agent** and **Frontend Agent** simultaneously.
    3.  Agents loop with their respective **Tool Executor** nodes.
    4.  Agents finish and hit a marker node which sets their `done` flag to `True`.
    5.  The **Join Node** acts as a synchronization barrier. It waits until both agents report `done = True`.
    6.  Moves to **Reviewer**.
    7.  If Reviewer says `"revise"`, it routes to the dummy `dispatch_revisions` node, which fans out and wakes up both agents again.
    8.  If Reviewer says `"approved"`, routes to **END**.

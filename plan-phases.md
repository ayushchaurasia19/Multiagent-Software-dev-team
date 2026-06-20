# Multi-Agent AI Software Development Team

## Project Goal

Build a multi-agent AI system that acts like a software development team.

Given a software requirement from a user, the system should:

- Analyze requirements
- Break work into tasks
- Coordinate specialized agents
- Generate software artifacts
- Review generated work
- Validate outputs
- Iterate through feedback loops

The focus of this project is **agent orchestration**, **workflow design**, **feedback loops**, and **tool usage**, not simply code generation.

---

# Hardware Constraints

Target environment:

- 16 GB RAM
- Intel i7 CPU
- Integrated graphics only
- No paid LLM APIs

Recommended stack:

- Ollama
- Qwen3-Coder 8B
- LangGraph
- FastAPI
- Python

Important:

All agents should initially share the same underlying model.

Example:

```python
planner_agent -> Qwen3-Coder 8B
developer_agent -> Qwen3-Coder 8B
reviewer_agent -> Qwen3-Coder 8B
tester_agent -> Qwen3-Coder 8B
```

The difference between agents comes from:

- System prompts
- Responsibilities
- Tools
- State access

Not from different LLMs.

---

# Development Roadmap

The project should be built through milestones.

Each milestone must produce a working system.

---

# Milestone 1: Core Infrastructure

## Goal

Establish the basic multi-agent framework.

## Deliverables

- Ollama running locally
- Qwen3-Coder 8B connected
- LangGraph setup
- Shared state implementation
- Planner Agent
- Developer Agent
- Basic workflow execution

## Architecture

```text
User
  ↓
Planner
  ↓
Developer
```

## Learnings

- LangGraph basics
- StateGraph
- Agent nodes
- State passing
- Local inference

## Suggested Structure

```text
src/

├── agents/
│   ├── planner.py
│   └── developer.py
│
├── graph/
│   └── workflow.py
│
├── state.py
│
└── main.py
```

---

# Milestone 2: Task Decomposition Workflow

## Goal

Introduce true agent specialization.

## Workflow

```text
User Requirement
       ↓
Planner Agent
       ↓
Task List
       ↓
Developer Agent
```

## Example

Input:

```text
Build a Library Management System
```

Planner Output:

```json
{
  "tasks": [
    "Design database schema",
    "Create backend APIs",
    "Create frontend pages"
  ]
}
```

Developer receives individual tasks and produces outputs.

## Learnings

- Structured outputs
- Task decomposition
- Agent specialization
- Shared state usage

---

# Milestone 3: Reviewer Feedback Loop

## Goal

Introduce self-correction.

## New Agent

Reviewer Agent

## Workflow

```text
Planner
   ↓
Developer
   ↓
Reviewer
```

Reviewer returns:

```json
{
  "status": "approved"
}
```

or

```json
{
  "status": "revise",
  "feedback": "Missing validation logic"
}
```

## Routing Logic

```text
Developer
    ↓
Reviewer
    ↓
Approved?
```

If approved:

```text
END
```

If revision required:

```text
Reviewer
     ↓
Developer
```

## Learnings

- Feedback loops
- Conditional routing
- Agent collaboration
- Iterative improvement

---

# Milestone 4: File Generation Tools

## Goal

Move beyond text responses.

## New Capabilities

Developer Agent gains tools:

- Write File
- Read File
- Create Directory

## Workflow

```text
Developer
      ↓
File Tools
      ↓
Generated Project
```

## Example Output

```text
generated_project/

├── backend/
├── frontend/
├── database/
└── docs/
```

## Learnings

- Tool calling
- Agent actions
- Artifact generation

---

# Milestone 5: Agent Specialization

## Goal

Replace the generic Developer Agent with specialized agents.

## New Architecture

```text
Planner
   ↓
Backend Agent
Frontend Agent
   ↓
Reviewer
```

## State Example

```python
{
    "requirements": "...",
    "backend_code": "...",
    "frontend_code": "...",
    "review_feedback": "..."
}
```

## Learnings

- Multi-agent collaboration
- Shared state management
- Specialized responsibilities

---

# Milestone 6: Tester Agent

## Goal

Introduce automated validation.

## New Agent

Tester Agent

## Workflow

```text
Backend Agent
       ↓
Tester Agent
       ↓
Validation Result
```

Tester responsibilities:

- Generate tests
- Analyze outputs
- Detect failures
- Produce reports

## Learnings

- Validation workflows
- Automated QA
- Verification systems

---

# Milestone 7: Pytest Code Execution

## Goal

Execute the generated test suites using `pytest` and feed results back to the agents for autonomous debugging.

## New Tool

`run_pytest_suite` (using python's `subprocess` or `pytest` library)

## Workflow

```text
Backend Agent
     ↓
Tester Agent (creates test suite)
     ↓
Pytest Execution Tool (runs tests)
     ↓
Results (stdout/stderr/tracebacks)
     ↓
Tester / Reviewer (inspects logs and decides if revision is needed)
```

## Key Value

- Autonomous error-driven refinement.
- Guarantees code correctness at runtime before approval.

---

# Milestone 8: Web UI Frontend

## Goal

Build a user-friendly frontend interface for the multi-agent application so users can submit requirements and visualize the team's progress.

## Features

- **Requirements Input:** Input area to submit software requirements.
- **Real-Time Progress Visualizer:** Shows which agent is currently active (Planner, Backend, Frontend, Tester, Reviewer) and displays their logs.
- **Workspace Inspector:** View generated files and folder structures directly in the UI.
- **Test Results Panel:** View `pytest` execution logs and coverage details.
- **Review Loop Interface:** See reviewer comments and approval status.

## Technology Stack

- **Backend API:** FastAPI (exposing LangGraph state and event streams).
- **Frontend App:** Vite + React (or Vanilla HTML/JS for simplicity and high performance).

---

# Milestone 9: AWS Deployment and Hosting

## Goal

Deploy the entire system on AWS to make it accessible to external users, utilizing a fully serverless, cost-conscious architecture designed to stay within AWS Free Tier limits.

## Scope & Architecture

- **Workflow Orchestration:** Use **AWS Step Functions** to orchestrate the multi-agent execution pipeline (replacing or wrapping the LangGraph state machine structure).
- **Agent Logic:** Use **AWS Lambda** for running agent logic and executing code verification tools.
- **State & Metadata Store:** Use **Amazon DynamoDB** to store workflow state history, intermediate agent outputs, logs, and execution metadata.
- **Artifacts Storage:** Use **Amazon S3** for storing the generated workspace artifacts, project files, and the test report documents.
- **Frontend Hosting:** Host the web frontend statically on **Amazon S3** combined with **Amazon CloudFront** for distribution.
- **API Gateway:** Use **Amazon API Gateway** to expose REST endpoints or WebSockets for the frontend to interact with the Lambda functions and step functions.

## Cost & Free Tier Guardrails

- The architecture is designed to remain entirely within the **AWS Free Tier** limits for personal testing and portfolios.
- **Serverless-only:** Avoid costly provisioned infrastructure such as EC2 instances, RDS databases, EKS, ECS, or NAT Gateways to prevent unexpected bills.
- **Secrets Management:** Securely retrieve Gemini API keys using **AWS Secrets Manager** or Systems Manager Parameter Store.

---

# Guiding Principle

The objective is to demonstrate a fully functional, self-correcting agentic coding team that is easily accessible via the web and deployable on production cloud infrastructure.
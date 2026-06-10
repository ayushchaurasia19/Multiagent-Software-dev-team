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

# Milestone 7: Code Execution

## Goal

Execute generated code instead of only reviewing it.

## New Tool

Execution Tool

Examples:

```python
pytest
```

```python
npm test
```

```python
python app.py
```

## Workflow

```text
Developer
    ↓
Tester
    ↓
Execution Tool
    ↓
Results
    ↓
Tester
```

Execution results should be fed back into the workflow.

## Learnings

- Runtime validation
- Error-driven refinement
- Autonomous debugging

---

# Milestone 8: Project Memory

## Goal

Prevent agents from forgetting previous decisions.

## Shared Memory Stores

- Architecture decisions
- API contracts
- Database schema
- Project requirements
- Coding standards

## Example

Store:

```text
Frontend expects:
access_token
```

Backend must continue using:

```text
access_token
```

throughout the workflow.

## Learnings

- Long-running workflows
- Context persistence
- Consistency management

---

# Milestone 9: Portfolio Version

## Final Architecture

```text
User
  ↓
Project Manager
  ↓
Planner
  ↓
Backend Agent
Frontend Agent
  ↓
Reviewer
  ↓
Tester
  ↓
Execution Tool
  ↓
Final Project Output
```

## Final Features

- Local LLM
- LangGraph orchestration
- Multi-agent workflow
- Feedback loops
- Tool calling
- File generation
- Test generation
- Code execution
- Shared memory
- Autonomous refinement

---

# Guiding Principle

The objective is NOT:

```text
Generate large software projects with one prompt
```

The objective IS:

```text
Use multiple specialized agents
+
Shared state
+
Tool usage
+
Feedback loops
+
Execution-based validation
```

to simulate a software development team and demonstrate modern agentic AI engineering concepts.
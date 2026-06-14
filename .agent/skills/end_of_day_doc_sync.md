---
name: end-of-day-doc-sync
description: Automatically syncs and updates project documentation to align with codebase changes made during the day. Use this at the end of the day before committing changes.
---

# End of Day Documentation Sync Skill

Detailed instructions for the agent to systematically update project documentation.

## When to use this skill

- Use this when the user asks to "sync docs for the day" or "trigger end of day doc sync".
- This is helpful for ensuring all central documentation (`AGENT_STATE_DOCS.md`, `AGENTS_DOCUMENTATION.md`, `README.md`, `.gitignore`) accurately reflects any architectural, state, or behavioral changes made to the codebase throughout the coding session, before the user commits their work.

## How to use it

Follow this systematic process to ensure the project's documentation remains perfectly aligned with the latest codebase changes.

### 1. Codebase Analysis
First, silently review the current state of the core architectural files:
- `src/state.py` (to identify new or removed state variables)
- `src/agents/` (to identify new, modified, or removed agents)
- `src/graph/workflow.py` (to identify changes in routing or execution flow)
- `tests/` (to understand how the workflow is being verified)
- `src/main.py` (to see the current entry point inputs/outputs)

### 2. Documentation Updates
Once you understand the day's changes, automatically update the following documentation files without asking for permission for each one. 

**CRITICAL FORMATTING RULE:** You must strictly maintain the existing formatting style, tone, and structure of each document. Use professional, technical language. Do not use emojis. Utilize GitHub Flavored Markdown alerts (e.g., `> [!NOTE]`, `> [!IMPORTANT]`) exactly as they are used in the existing documents.

#### Update `AGENT_STATE_DOCS.md`
- Ensure every attribute in `AgentState` is accurately documented.
- If an attribute was added (e.g., specific message streams or boolean flags), add a new section for it following the established format:
  - **What it is:**
  - **Who uses it:**
- If an attribute was removed, delete its section.

#### Update `AGENTS_DOCUMENTATION.md`
- Ensure all active agents have a dedicated section.
- Document any changes to their system prompts, inputs, or outputs.
- Explain how they interact with tools.

#### Update `README.md`
- Ensure the **System Architecture** section (including Mermaid diagrams) accurately reflects the current LangGraph topology.
- Update the **Features** and **Workflow Execution Example** if new capabilities were added.
- Ensure the **Project Structure** tree is up-to-date.

### 3. Configuration Checks
#### Update `.gitignore`
- Review the project root for any newly generated environment folders, cache directories, or database files.
- If new ephemeral/generated files exist, append them to `.gitignore`.

### 4. Final Reporting
After all files have been updated, provide the user with a concise summary of the specific documents updated and a bulleted list of the major architectural changes you synced.

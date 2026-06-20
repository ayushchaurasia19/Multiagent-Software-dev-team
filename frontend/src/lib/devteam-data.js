// DevTeam Portal — runtime data store.
// All arrays start empty; they will be populated by live WebSocket / API events.

export const AGENT_COLOR = {
  planner:  "var(--agent-planner)",
  backend:  "var(--agent-backend)",
  frontend: "var(--agent-frontend)",
  tester:   "var(--agent-tester)",
  reviewer: "var(--agent-reviewer)",
};

export const AGENTS = [
  {
    id: "planner",
    name: "Planner",
    role: "Decomposes user intent into tasks",
    state: "idle",
    currentTask: "—",
    pendingTasks: [],
    filesCreated: [],
    filesModified: [],
    feedback: [],
    retryCount: 0,
    elapsedMs: 0,
    progress: 0,
  },
  {
    id: "backend",
    name: "Backend Agent",
    role: "Generates server code and APIs",
    state: "idle",
    currentTask: "—",
    pendingTasks: [],
    filesCreated: [],
    filesModified: [],
    feedback: [],
    retryCount: 0,
    elapsedMs: 0,
    progress: 0,
  },
  {
    id: "frontend",
    name: "Frontend Agent",
    role: "Builds UI components",
    state: "idle",
    currentTask: "—",
    pendingTasks: [],
    filesCreated: [],
    filesModified: [],
    feedback: [],
    retryCount: 0,
    elapsedMs: 0,
    progress: 0,
  },
  {
    id: "tester",
    name: "Tester Agent",
    role: "Writes & runs tests",
    state: "idle",
    currentTask: "—",
    pendingTasks: [],
    filesCreated: [],
    filesModified: [],
    feedback: [],
    retryCount: 0,
    elapsedMs: 0,
    progress: 0,
  },
  {
    id: "reviewer",
    name: "Reviewer Agent",
    role: "Reviews diffs, requests changes",
    state: "idle",
    currentTask: "—",
    pendingTasks: [],
    filesCreated: [],
    filesModified: [],
    feedback: [],
    retryCount: 0,
    elapsedMs: 0,
    progress: 0,
  },
];

export const EDGES = [
  { from: "planner",  to: "backend",  active: false },
  { from: "planner",  to: "frontend", active: false },
  { from: "backend",  to: "tester",   active: false },
  { from: "frontend", to: "tester",   active: false },
  { from: "tester",   to: "reviewer", active: false },
  { from: "reviewer", to: "backend",  active: false },
  { from: "reviewer", to: "frontend", active: false },
];

// Populated at runtime via API / WebSocket events
export const TRACE    = [];
export const MESSAGES = [];
export const REASONING = [];
export const FILES    = [];
export const FILE_TREE = [];

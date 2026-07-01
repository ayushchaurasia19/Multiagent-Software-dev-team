import { useState, useEffect, useRef } from "react";
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from "react-resizable-panels";
import {
  Boxes, Radio, Pause, Play, Settings, Activity,
  FolderOpen, ArrowRight, Sparkles, Terminal, AlertCircle,
} from "lucide-react";
import WorkflowGraph from "./components/WorkflowGraph";
import ExecutionTrace from "./components/ExecutionTrace";
import AgentMessages from "./components/AgentMessages";
import WorkspaceStrip from "./components/WorkspaceStrip";
import WorkspaceView from "./components/WorkspaceView";
import { AGENTS, EDGES } from "./lib/devteam-data";
import "./index.css";

const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

// Map LangGraph node names → our agent ids
const NODE_TO_AGENT = {
  planner:         "planner",
  backend_agent:   "backend",
  frontend_agent:  "frontend",
  tester_agent:    "tester",
  reviewer:        "reviewer",
  backend_tools:   "backend",
  frontend_tools:  "frontend",
  tester_tools:    "tester",
};

// ── Launch Screen ─────────────────────────────────────────────────────────────
function LaunchScreen({ onStart }) {
  const [prompt,    setPrompt]    = useState("");
  const [launching, setLaunching] = useState(false);
  const [error,     setError]     = useState("");

  const workDir = "/home/ayush-chaurasia/Multi-agent-Project/workspace";
  const canStart = prompt.trim().length > 0;

  const handleStart = () => {
    if (!canStart || launching) return;
    setError("");
    setLaunching(true);
    // Since we merged /run and /stream into a single GET endpoint, we just pass the prompt directly to the Dashboard.
    onStart({ prompt: prompt.trim(), workDir: workDir.trim(), threadId: null });
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleStart();
  };

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      height: "100vh", background: "var(--background)", fontFamily: "var(--font-sans)", padding: "24px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "48px" }}>
        <Boxes style={{ width: "28px", height: "28px", color: "var(--primary)" }} />
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "22px", fontWeight: 700, letterSpacing: "-0.03em" }}>
          DevTeam<span style={{ color: "var(--primary)" }}>.</span>Portal
        </span>
      </div>

      <div style={{
        width: "100%", maxWidth: "640px", borderRadius: "12px",
        border: "1px solid var(--panel-border)", background: "var(--panel)", padding: "32px",
        boxShadow: "0 8px 40px color-mix(in oklab, var(--primary) 8%, transparent)",
      }}>
        <div style={{ marginBottom: "24px" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: "8px",
            fontFamily: "var(--font-mono)", fontSize: "11px", textTransform: "uppercase",
            letterSpacing: "0.08em", color: "var(--primary)", marginBottom: "8px",
          }}>
            <Sparkles style={{ width: "12px", height: "12px" }} /> new session
          </div>
          <h1 style={{ fontSize: "20px", fontWeight: 600, color: "var(--foreground)", margin: 0 }}>
            What should the team build?
          </h1>
          <p style={{ marginTop: "6px", fontSize: "13px", color: "var(--muted-foreground)", lineHeight: "1.6" }}>
            Describe your project goal. The agent team will plan, build, test, and review autonomously.
          </p>
        </div>

        {/* Prompt */}
        <div style={{ marginBottom: "16px" }}>
          <label style={{
            display: "block", fontFamily: "var(--font-mono)", fontSize: "10px",
            textTransform: "uppercase", letterSpacing: "0.06em",
            color: "var(--muted-foreground)", marginBottom: "6px",
          }}>Project prompt</label>
          <textarea
            value={prompt} onChange={e => setPrompt(e.target.value)} onKeyDown={handleKey}
            placeholder="e.g. Build a REST API with JWT auth, a React login UI, and full test coverage…"
            rows={5}
            style={{
              width: "100%", borderRadius: "6px", border: "1px solid var(--panel-border)",
              background: "var(--surface)", padding: "12px 14px",
              fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--foreground)",
              lineHeight: "1.65", resize: "vertical", outline: "none",
              transition: "border-color 0.15s", boxSizing: "border-box",
            }}
            onFocus={e => e.target.style.borderColor = "var(--primary)"}
            onBlur={e  => e.target.style.borderColor = "var(--panel-border)"}
          />
        </div>



        {error && (
          <div style={{
            marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px",
            borderRadius: "6px", border: "1px solid color-mix(in oklab, var(--state-failed) 40%, transparent)",
            background: "color-mix(in oklab, var(--state-failed) 10%, transparent)",
            padding: "10px 14px", fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--state-failed)",
          }}>
            <AlertCircle style={{ width: "14px", height: "14px", flexShrink: 0 }} />
            {error}
          </div>
        )}

        <button
          onClick={handleStart} disabled={!canStart || launching}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            width: "100%", borderRadius: "6px", padding: "12px 20px",
            fontFamily: "var(--font-mono)", fontSize: "13px", fontWeight: 600,
            cursor: canStart && !launching ? "pointer" : "not-allowed",
            background: canStart ? "var(--primary)" : "color-mix(in oklab, var(--primary) 30%, transparent)",
            color: canStart ? "var(--background)" : "var(--muted-foreground)",
            border: "none", transition: "all 0.2s", opacity: launching ? 0.7 : 1,
          }}
          onMouseEnter={e => { if (canStart && !launching) e.currentTarget.style.filter = "brightness(1.1)"; }}
          onMouseLeave={e => { e.currentTarget.style.filter = "brightness(1)"; }}
        >
          {launching
            ? <><Terminal style={{ width: "14px", height: "14px" }} /> Starting session…</>
            : <><ArrowRight style={{ width: "14px", height: "14px" }} /> Launch agent team</>}
        </button>
        <p style={{ marginTop: "12px", textAlign: "center", fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--muted-foreground)" }}>
          ⌘ + Enter to start
        </p>
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function Dashboard({ session, onOpenFile }) {
  const [selected,  setSelected]  = useState("planner");
  const [agents,    setAgents]    = useState(AGENTS);
  const [edges,     setEdges]     = useState(EDGES);
  const [trace,     setTrace]     = useState([]);
  const [messages,  setMessages]  = useState([]);
  const [files,     setFiles]     = useState([]);
  const [running,   setRunning]   = useState(true);
  const [status,    setStatus]    = useState("initializing"); // orchestrator status text
  const [tick,      setTick]      = useState(0);
  const [lastEvent, setLastEvent] = useState(null);
  const traceIdRef = useRef(0);
  const activeAgentRef = useRef("planner");

  // ── tick counter for elapsed time ──
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setTick(t => t + 1);
      setAgents(prev => prev.map(a =>
        a.state === "running"
          ? { ...a, elapsedMs: a.elapsedMs + 1000 }
          : a
      ));
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  // ── SSE stream from /api/run_stream ──
  useEffect(() => {
    let es;
    let closed = false;

    const connect = () => {
      // Connect directly to the streaming endpoint, passing the prompt as a query param
      const url = new URL(`${API_BASE}/run_stream`);
      url.searchParams.append("requirements", session.prompt);
      
      es = new EventSource(url.toString());

      es.onmessage = (e) => {
        let msg;
        try { msg = JSON.parse(e.data); } catch { return; }
        setLastEvent(new Date().toLocaleTimeString());

        if (msg.type === "idle") {
          setStatus("idle");
          return;
        }

        if (msg.type === "done") {
          setStatus("completed");
          setRunning(false);
          setAgents(prev => prev.map(a => ({ ...a, state: "completed", progress: 100 })));
          es.close();
          return;
        }

        if (msg.type === "error") {
          setStatus("error");
          setRunning(false);
          addTrace("error", "system", "Workflow error", msg.message);
          es.close();
          return;
        }

        // ── node_update: agent changed state ──
        if (msg.type === "node_update") {
          const agentId = NODE_TO_AGENT[msg.node];
          const outState = msg.state || {};
          
          if (outState.messages && Array.isArray(outState.messages)) {
            const newMessages = outState.messages.map((str, idx) => {
               const bodyText = typeof str === "string" ? str : (typeof str?.content === "string" ? str.content : JSON.stringify(str));
               let from = agentId || "system";
               if (bodyText.toLowerCase().includes("reviewer")) from = "reviewer";
               else if (bodyText.toLowerCase().includes("backend")) from = "backend";
               else if (bodyText.toLowerCase().includes("frontend")) from = "frontend";
               else if (bodyText.toLowerCase().includes("tester")) from = "tester";
               else if (bodyText.toLowerCase().includes("planner")) from = "planner";

               return {
                 id: "msg_" + Date.now() + "_" + idx,
                 from,
                 to: "team",
                 timestamp: new Date().toLocaleTimeString(),
                 body: bodyText
               };
            });
            setMessages(prev => [...prev, ...newMessages]);
          }

          if (agentId) {
            setAgents(prev => prev.map(a => {
              if (a.id !== agentId) return a;
              const updated = { ...a, state: "completed", progress: 100 };
              // pull tasks out of state if present
              if (agentId === "planner" && outState.backend_tasks?.length) {
                updated.currentTask = `Planning: ${outState.backend_tasks.length} backend + ${outState.frontend_tasks?.length ?? 0} frontend tasks`;
              }
              return updated;
            }));

            // activate edges leading to this node
            setEdges(prev => prev.map(edge => ({
              ...edge,
              active: NODE_TO_AGENT[msg.node] === edge.to ? true : edge.active,
            })));

            const nodeLabel = msg.node.replace(/_/g, " ");
            addTrace("observation", agentId, `${nodeLabel} ▶ active`, JSON.stringify(msg.state ?? {}, null, 2).slice(0, 400));
          }
          return;
        }

        // ── trace event ──
        if (msg.type === "trace") {
          const ev = msg.content;
          
          if (ev.event === "on_chain_start") {
            const aid = NODE_TO_AGENT[ev.name];
            if (aid) {
              activeAgentRef.current = aid;
              setAgents(prev => prev.map(a =>
                a.id === aid ? { ...a, state: "running", currentTask: `Running: ${ev.name}` } : a
              ));
              setStatus(`${ev.name} running`);
            }
          }

          const agentId = NODE_TO_AGENT[ev.name] ?? activeAgentRef.current;
          const kind = ev.event?.replace("on_", "").replace("_start", "_call").replace("_end", "_output") ?? "observation";
          addTrace(kind, agentId, `${ev.name} · ${ev.event}`, JSON.stringify(ev.data ?? {}).slice(0, 300));
          if (ev.event === "on_chain_end") {
            const aid = NODE_TO_AGENT[ev.name];
            if (aid) {
              setAgents(prev => prev.map(a =>
                a.id === aid ? { ...a, state: "completed", progress: 100 } : a
              ));
            }
          }
          return;
        }

        // ── log line from stdout ──
        if (msg.type === "log") {
          addTrace("observation", "planner", "log", msg.content);
        }
      };

      es.onerror = () => {
        if (!closed) {
          setStatus("connection lost, reconnecting...");
          es.close();
          // We won't auto-reconnect for run_stream because it restarts the workflow.
          setStatus("error");
          addTrace("error", "system", "Network Error", "Lost connection to the streaming server.");
        }
      };
    };

    connect();
    return () => { closed = true; es?.close(); };
  }, [session.prompt]);

  // ── Poll workspace files every 3s ──
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`${API_BASE}/workspace`);
        if (!res.ok) return;
        const { files: tree } = await res.json();
        setFiles(tree || []);
      } catch { /* backend not ready yet */ }
    };
    poll();
    const id = setInterval(poll, 3000);
    return () => clearInterval(id);
  }, []);

  const addTrace = (kind, agent, title, body) => {
    const id = `t${++traceIdRef.current}`;
    const timestamp = new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit", fractionalSecondDigits: 3 });
    setTrace(prev => [...prev, { id, timestamp, agent: agent || "system", kind, title, body: String(body ?? "") }]);
  };

  const onRetry = (agentId) => {
    setAgents(prev => prev.map(a =>
      a.id === agentId ? { ...a, state: "running", retryCount: a.retryCount + 1, progress: 10, elapsedMs: 0 } : a
    ));
  };

  const selectedAgent = agents.find(a => a.id === selected) || agents[0];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--background)", fontFamily: "var(--font-sans)" }}>
      {/* ── Header ── */}
      <header style={{
        display: "flex", height: "44px", flexShrink: 0, alignItems: "center", justifyContent: "space-between",
        borderBottom: "1px solid var(--panel-border)", background: "var(--panel)", padding: "0 12px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ position: "relative" }}>
              <Boxes style={{ width: "16px", height: "16px", color: "var(--primary)" }} />
              <span className="blink" style={{
                position: "absolute", right: "-2px", top: "-2px",
                width: "6px", height: "6px", borderRadius: "50%",
                background: running ? "var(--state-running)" : "var(--state-completed)",
              }} />
            </div>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "13px", fontWeight: 600, letterSpacing: "-0.02em" }}>
              DevTeam<span style={{ color: "var(--primary)" }}>.</span>Portal
            </span>
          </div>

          <span style={{ color: "color-mix(in oklab, var(--foreground) 20%, transparent)" }}>/</span>

          {/* Workspace directory — prominent */}
          <div style={{
            display: "flex", alignItems: "center", gap: "6px",
            borderRadius: "4px", border: "1px solid color-mix(in oklab, var(--primary) 35%, transparent)",
            background: "color-mix(in oklab, var(--primary) 8%, transparent)",
            padding: "2px 8px",
          }}>
            <FolderOpen style={{ width: "12px", height: "12px", color: "var(--primary)" }} />
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--primary)",
              maxWidth: "320px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>{session.workDir}</span>
          </div>

          <span style={{ color: "color-mix(in oklab, var(--foreground) 20%, transparent)" }}>/</span>

          <div style={{ display: "flex", alignItems: "center", gap: "4px", fontFamily: "var(--font-mono)", fontSize: "11px" }}>
            <Radio className={running ? "blink" : ""} style={{ width: "12px", height: "12px", color: running ? "var(--state-running)" : "var(--state-completed)" }} />
            <span style={{ color: "color-mix(in oklab, var(--foreground) 80%, transparent)" }}>
              session #{session.threadId?.slice(0, 8) ?? "—"}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--muted-foreground)" }}>
            tick {tick}
          </span>
        </div>
      </header>

      {/* ── Status bar ── */}
      <div style={{
        display: "flex", height: "28px", flexShrink: 0, alignItems: "center", gap: "16px",
        borderBottom: "1px solid var(--panel-border)",
        background: "color-mix(in oklab, var(--panel) 60%, transparent)",
        padding: "0 12px", fontFamily: "var(--font-mono)", fontSize: "10.5px", color: "var(--muted-foreground)",
      }}>
        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <Activity style={{ width: "12px", height: "12px", color: "var(--state-running)" }} className={running ? "blink" : ""} />
          orchestrator: <span style={{ color: "color-mix(in oklab, var(--foreground) 80%, transparent)" }}>{status}</span>
        </span>
        <span>queue: <span style={{ color: "color-mix(in oklab, var(--foreground) 80%, transparent)" }}>{trace.length}</span></span>
        <span>files: <span style={{ color: "color-mix(in oklab, var(--foreground) 80%, transparent)" }}>{files.length}</span></span>
        <span style={{ marginLeft: "auto", color: "color-mix(in oklab, var(--foreground) 50%, transparent)" }}>
          {lastEvent ? `last event ${lastEvent}` : "awaiting first event…"}
        </span>
      </div>

      {/* ── Panels ── */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <PanelGroup direction="horizontal" style={{ display: "flex", height: "100%", width: "100%" }}>
          <Panel defaultSize={26} minSize={14} collapsible style={{ minWidth: 0 }}>
            <ExecutionTrace events={trace} />
          </Panel>
          <PanelResizeHandle className="resize-handle" />

          <Panel defaultSize={74} minSize={30} style={{ minWidth: 0 }}>
            <PanelGroup direction="vertical" style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%" }}>
              <Panel defaultSize={55} minSize={25} style={{ minHeight: 0 }}>
                <WorkflowGraph agents={agents} edges={edges} selected={selected} onSelect={setSelected} />
              </Panel>
              <PanelResizeHandle className="resize-handle-h" />
              <Panel defaultSize={22} minSize={12} collapsible style={{ minHeight: 0 }}>
                <WorkspaceStrip files={files} onOpenFile={onOpenFile} workDir={session.workDir} />
              </Panel>
              <PanelResizeHandle className="resize-handle-h" />
              <Panel defaultSize={23} minSize={14} collapsible style={{ minHeight: 0 }}>
                <AgentMessages messages={messages} />
              </Panel>
            </PanelGroup>
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
function App() {
  const [phase,        setPhase]        = useState("launch");
  const [session,      setSession]      = useState(null);
  const [openFilePath, setOpenFilePath] = useState(null);

  const handleStart = ({ prompt, workDir, threadId }) => {
    setSession({ prompt, workDir, threadId });
    setPhase("dashboard");
  };

  const handleOpenFile = (path) => { setOpenFilePath(path); setPhase("workspace"); };
  const handleBack     = ()     => { setPhase("dashboard"); setOpenFilePath(null); };

  if (phase === "launch")     return <LaunchScreen onStart={handleStart} />;
  return (
    <>
      <div style={{ display: phase === "dashboard" ? "block" : "none", height: "100vh" }}>
        {session && <Dashboard session={session} onOpenFile={handleOpenFile} />}
      </div>
      {phase === "workspace" && (
        <WorkspaceView initialPath={openFilePath} onBack={handleBack} />
      )}
    </>
  );
}

export default App;

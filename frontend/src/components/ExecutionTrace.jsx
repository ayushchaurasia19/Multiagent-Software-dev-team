import { useState, useMemo } from "react";
import { AGENT_COLOR } from "../lib/devteam-data";
import {
  ChevronDown, ChevronRight, Search, AlertCircle, Wrench, Brain,
  MessageSquare, RefreshCw, FileInput, ListChecks, Eye,
} from "lucide-react";

const KIND_ICON = {
  input: FileInput,
  task: ListChecks,
  observation: Eye,
  tool_call: Wrench,
  tool_output: Wrench,
  error: AlertCircle,
  retry: RefreshCw,
  feedback: MessageSquare,
  response: Brain,
};

const KIND_COLOR = {
  input: "var(--muted-foreground)",
  task: "var(--agent-planner)",
  observation: "var(--agent-backend)",
  tool_call: "var(--agent-frontend)",
  tool_output: "var(--agent-frontend)",
  error: "var(--state-failed)",
  retry: "var(--state-waiting)",
  feedback: "var(--agent-reviewer)",
  response: "var(--primary)",
};

export default function ExecutionTrace({ events }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [expanded, setExpanded] = useState({});

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    const result = events.filter(
      (e) =>
        (filter === "all" || e.kind === filter) &&
        (!q || e.title.toLowerCase().includes(q) || e.body.toLowerCase().includes(q) || e.agent.includes(q))
    );
    return result.reverse();
  }, [events, query, filter]);

  const kinds = ["all", "tool_call", "observation", "error", "feedback", "retry"];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--panel)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", borderBottom: "1px solid var(--panel-border)", padding: "8px 12px" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--muted-foreground)" }}>execution.trace</span>
        <div style={{ position: "relative", marginLeft: "8px", flex: 1 }}>
          <Search style={{ position: "absolute", left: "8px", top: "50%", transform: "translateY(-50%)", width: "14px", height: "14px", color: "var(--muted-foreground)" }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="search trace…"
            style={{
              width: "100%", borderRadius: "4px", border: "1px solid var(--panel-border)",
              background: "var(--surface)", padding: "4px 8px 4px 28px",
              fontFamily: "var(--font-mono)", fontSize: "12px",
              color: "var(--foreground)",
            }}
          />
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", alignItems: "center", gap: "4px", borderBottom: "1px solid var(--panel-border)", padding: "6px 12px", overflowX: "auto" }}>
        {kinds.map((k) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            style={{
              borderRadius: "4px", padding: "2px 8px",
              fontFamily: "var(--font-mono)", fontSize: "10px",
              textTransform: "uppercase", letterSpacing: "0.05em",
              transition: "all 0.15s",
              background: filter === k ? "var(--accent)" : "transparent",
              color: filter === k ? "var(--foreground)" : "var(--muted-foreground)",
            }}
            onMouseEnter={(e) => { if (filter !== k) e.target.style.background = "var(--surface-hover)"; }}
            onMouseLeave={(e) => { if (filter !== k) e.target.style.background = "transparent"; }}
          >
            {k}
          </button>
        ))}
      </div>

      {/* Events */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
        {events.length === 0 && (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            height: "100%", gap: "10px",
            fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--muted-foreground)",
            textAlign: "center", padding: "32px 16px",
          }}>
            <span style={{ fontSize: "22px", opacity: 0.4 }}>⏳</span>
            <span>Execution trace will appear here once the session starts</span>
          </div>
        )}
        {events.length > 0 && filtered.length === 0 && (
          <div style={{ padding: "32px 12px", textAlign: "center", fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--muted-foreground)" }}>
            no events match
          </div>
        )}
        {filtered.map((e) => {
          const Icon = KIND_ICON[e.kind] || Eye;
          const isOpen = expanded[e.id] ?? (e.kind === "error" || e.body.length < 140);
          const truncated = !isOpen && e.body.length > 140;
          const color = KIND_COLOR[e.kind] || "var(--muted-foreground)";
          return (
            <div key={e.id} className="fade-in" style={{
              marginBottom: "4px", borderRadius: "4px",
              border: "1px solid var(--panel-border)",
              background: "color-mix(in oklab, var(--surface) 60%, transparent)",
            }}
            onMouseEnter={ev => ev.currentTarget.style.background = "var(--surface)"}
            onMouseLeave={ev => ev.currentTarget.style.background = "color-mix(in oklab, var(--surface) 60%, transparent)"}
            >
              <button
                onClick={() => setExpanded((s) => ({ ...s, [e.id]: !isOpen }))}
                style={{
                  display: "flex", width: "100%", alignItems: "flex-start", gap: "8px",
                  padding: "8px 10px", textAlign: "left", cursor: "pointer",
                }}
              >
                {isOpen
                  ? <ChevronDown style={{ marginTop: "2px", width: "14px", height: "14px", flexShrink: 0, color: "var(--muted-foreground)" }} />
                  : <ChevronRight style={{ marginTop: "2px", width: "14px", height: "14px", flexShrink: 0, color: "var(--muted-foreground)" }} />
                }
                <Icon style={{ marginTop: "2px", width: "14px", height: "14px", flexShrink: 0, color }} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "8px", fontFamily: "var(--font-mono)", fontSize: "12px" }}>
                    <span style={{ color: "var(--muted-foreground)" }}>{e.timestamp}</span>
                    <span style={{
                      borderRadius: "4px", padding: "1px 6px", fontSize: "10px", textTransform: "uppercase",
                      background: `color-mix(in oklab, ${AGENT_COLOR[e.agent]} 18%, transparent)`,
                      color: AGENT_COLOR[e.agent],
                    }}>{e.agent}</span>
                    <span style={{ color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.title}</span>
                  </div>
                </div>
              </button>
              {isOpen && (
                <div style={{ borderTop: "1px solid color-mix(in oklab, var(--panel-border) 70%, transparent)", padding: "6px 12px 10px" }}>
                  <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "var(--font-mono)", fontSize: "11.5px", lineHeight: "1.65", color: "color-mix(in oklab, var(--foreground) 85%, transparent)" }}>{e.body}</pre>
                </div>
              )}
              {truncated && (
                <div style={{ borderTop: "1px solid color-mix(in oklab, var(--panel-border) 70%, transparent)", padding: "4px 12px 8px" }}>
                  <pre className="line-clamp-2" style={{ whiteSpace: "pre-wrap", fontFamily: "var(--font-mono)", fontSize: "11.5px", color: "var(--muted-foreground)" }}>{e.body}</pre>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { useState, useMemo } from "react";
import { AGENT_COLOR } from "../lib/devteam-data";

const ICONS = {
  planner: (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="16" y="16" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="9" y="2" width="6" height="6" rx="1"/><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"/><path d="M12 12V8"/>
    </svg>
  ),
  backend: (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M15 2v2"/><path d="M15 20v2"/><path d="M2 15h2"/><path d="M2 9h2"/><path d="M20 15h2"/><path d="M20 9h2"/><path d="M9 2v2"/><path d="M9 20v2"/>
    </svg>
  ),
  frontend: (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="m10 13-2 2 2 2"/><path d="m14 17 2-2-2-2"/>
    </svg>
  ),
  tester: (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M20 2v17a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V2"/><path d="M20 2H4"/><path d="m6 12 5 3v-6z"/><path d="M14 12h.01"/>
    </svg>
  ),
  reviewer: (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>
    </svg>
  ),
};

// Node coordinates on a 1000x520 viewBox
const POS = {
  planner: { x: 120, y: 260 },
  backend: { x: 400, y: 130 },
  frontend: { x: 400, y: 390 },
  tester: { x: 680, y: 260 },
  reviewer: { x: 900, y: 260 },
};

const STATE_STYLE = {
  idle: { ring: "var(--state-idle)", label: "Idle" },
  running: { ring: "var(--state-running)", label: "Running" },
  waiting: { ring: "var(--state-waiting)", label: "Waiting" },
  reviewing: { ring: "var(--state-running)", label: "Reviewing" },
  completed: { ring: "var(--state-completed)", label: "Completed" },
  failed: { ring: "var(--state-failed)", label: "Failed" },
};

export default function WorkflowGraph({ agents, edges, selected, onSelect }) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(null);

  const agentMap = useMemo(
    () => Object.fromEntries(agents.map((a) => [a.id, a])),
    [agents]
  );

  return (
    <div style={{ position: "relative", display: "flex", flexDirection: "column", height: "100%", background: "var(--panel)" }}>
      {/* Header bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: "1px solid var(--panel-border)", padding: "8px 12px", fontSize: "12px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--state-running)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="blink">
            <path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/>
          </svg>
          <span>workflow.graph</span>
          <span style={{ color: "color-mix(in oklab, var(--foreground) 40%, transparent)" }}>·</span>
          <span>{agents.filter((a) => a.state === "running").length} running</span>
          <span style={{ color: "color-mix(in oklab, var(--foreground) 40%, transparent)" }}>·</span>
          <span>{agents.filter((a) => a.state === "failed").length} failed</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px", fontFamily: "var(--font-mono)" }}>
          <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
            style={{ borderRadius: "4px", padding: "2px 6px", color: "var(--muted-foreground)", fontSize: "12px" }}
            onMouseEnter={e => e.target.style.background = "var(--surface-hover)"}
            onMouseLeave={e => e.target.style.background = "transparent"}>−</button>
          <span style={{ width: "40px", textAlign: "center", color: "var(--muted-foreground)", fontSize: "12px" }}>{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((z) => Math.min(2, z + 0.1))}
            style={{ borderRadius: "4px", padding: "2px 6px", color: "var(--muted-foreground)", fontSize: "12px" }}
            onMouseEnter={e => e.target.style.background = "var(--surface-hover)"}
            onMouseLeave={e => e.target.style.background = "transparent"}>+</button>
          <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
            style={{ borderRadius: "4px", padding: "2px 6px", marginLeft: "4px", color: "var(--muted-foreground)", fontSize: "12px" }}
            onMouseEnter={e => e.target.style.background = "var(--surface-hover)"}
            onMouseLeave={e => e.target.style.background = "transparent"}>reset</button>
        </div>
      </div>

      {/* Canvas */}
      <div
        style={{ position: "relative", flex: 1, overflow: "hidden", cursor: dragging ? "grabbing" : "grab" }}
        onMouseDown={(e) => setDragging({ x: e.clientX - pan.x, y: e.clientY - pan.y })}
        onMouseMove={(e) => dragging && setPan({ x: e.clientX - dragging.x, y: e.clientY - dragging.y })}
        onMouseUp={() => setDragging(null)}
        onMouseLeave={() => setDragging(null)}
      >
        {/* Grid background */}
        <div
          style={{
            position: "absolute", inset: 0, opacity: 0.4,
            backgroundImage: "linear-gradient(to right, color-mix(in oklab, var(--foreground) 5%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklab, var(--foreground) 5%, transparent) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
            backgroundPosition: `${pan.x}px ${pan.y}px`,
          }}
        />
        <svg viewBox="0 0 1000 520" style={{ position: "relative", width: "100%", height: "100%", transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "center" }}>
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="color-mix(in oklab, var(--foreground) 35%, transparent)" />
            </marker>
            <marker id="arrow-active" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="var(--primary)" />
            </marker>
          </defs>

          {/* Edges */}
          {edges.map((e, i) => {
            const a = POS[e.from], b = POS[e.to];
            const mx = (a.x + b.x) / 2;
            const d = `M ${a.x + 36} ${a.y} Q ${mx} ${a.y}, ${mx} ${(a.y + b.y) / 2} T ${b.x - 36} ${b.y}`;
            return (
              <g key={i}>
                <path d={d} stroke="color-mix(in oklab, var(--foreground) 18%, transparent)" strokeWidth="1.5" fill="none" markerEnd="url(#arrow)" />
                {e.active && (
                  <path d={d} stroke="var(--primary)" strokeWidth="2" fill="none" className="flow-dash" markerEnd="url(#arrow-active)" />
                )}
              </g>
            );
          })}

          {/* Agent nodes */}
          {agents.map((a) => {
            const p = POS[a.id];
            if (!p) return null;
            const color = AGENT_COLOR[a.id];
            const st = STATE_STYLE[a.state] || STATE_STYLE.idle;
            const Icon = ICONS[a.id];
            const isSelected = selected === a.id;
            const isLive = a.state === "running" || a.state === "reviewing";
            return (
              <g key={a.id} transform={`translate(${p.x}, ${p.y})`} style={{ cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); onSelect(a.id); }}>
                {isLive && (
                  <circle r="44" fill="none" stroke={color} strokeWidth="1" opacity="0.35">
                    <animate attributeName="r" from="36" to="56" dur="1.8s" repeatCount="indefinite" />
                    <animate attributeName="opacity" from="0.45" to="0" dur="1.8s" repeatCount="indefinite" />
                  </circle>
                )}
                <circle r="36" fill="var(--card)" stroke={isSelected ? "var(--primary)" : st.ring} strokeWidth={isSelected ? 2.5 : 1.5} style={isLive ? { filter: `drop-shadow(0 0 12px ${color})` } : undefined} />
                <foreignObject x="-12" y="-26" width="24" height="24">
                  {Icon && <Icon style={{ width: "24px", height: "24px", color: "var(--foreground)" }} />}
                </foreignObject>
                <text textAnchor="middle" y="8" style={{ fill: "var(--foreground)", fontFamily: "var(--font-mono)", fontSize: "11px" }}>{a.name.split(" ")[0]}</text>
                <text textAnchor="middle" y="22" style={{ fill: st.ring, fontFamily: "var(--font-mono)", fontSize: "9px" }}>{st.label.toLowerCase()}</text>
                <text textAnchor="middle" y="58" style={{ fill: "var(--muted-foreground)", fontFamily: "var(--font-mono)", fontSize: "9px" }}>
                  {a.progress}% · {(a.elapsedMs / 1000).toFixed(1)}s{a.retryCount > 0 ? ` · ⟳${a.retryCount}` : ""}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

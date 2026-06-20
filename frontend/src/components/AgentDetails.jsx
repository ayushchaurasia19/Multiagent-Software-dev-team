import { useState } from "react";
import { AGENT_COLOR } from "../lib/devteam-data";
import { ChevronDown, FileCode2, FilePlus2, MessageSquare, RotateCw, Timer, Zap, Brain } from "lucide-react";

function Metric({ icon: Icon, label, value, accent }) {
  return (
    <div style={{ background: "var(--panel)", padding: "8px 12px" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: "4px",
        fontFamily: "var(--font-mono)", fontSize: "9px",
        textTransform: "uppercase", letterSpacing: "0.05em",
        color: "var(--muted-foreground)",
      }}>
        <Icon style={{ width: "10px", height: "10px" }} /> {label}
      </div>
      <div style={{
        marginTop: "2px", fontFamily: "var(--font-mono)", fontSize: "14px",
        color: accent ? "var(--state-waiting)" : "var(--foreground)",
      }}>{value}</div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ borderBottom: "1px solid var(--panel-border)", padding: "10px 12px" }}>
      <div style={{
        marginBottom: "6px", fontFamily: "var(--font-mono)", fontSize: "10px",
        textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted-foreground)",
      }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>{children}</div>
    </div>
  );
}

export default function AgentDetails({ agent, messages, reasoning, onRetry }) {
  const [showThinking, setShowThinking] = useState(false);
  const myMessages = messages.filter((m) => m.from === agent.id || m.to === agent.id);
  const myReasoning = reasoning.filter((r) => r.agent === agent.id);
  const color = AGENT_COLOR[agent.id];

  const stateKey = agent.state === "reviewing" ? "running" : agent.state;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--panel)" }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: "1px solid var(--panel-border)", padding: "8px 12px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
          <div style={{
            width: "8px", height: "8px", borderRadius: "50%", flexShrink: 0,
            background: color,
            boxShadow: agent.state === "running" ? `0 0 10px ${color}` : undefined,
          }} />
          <span className="truncate" style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--foreground)" }}>
            {agent.name.toLowerCase().replace(" ", ".")}
          </span>
          <span style={{
            borderRadius: "4px", padding: "2px 6px",
            fontFamily: "var(--font-mono)", fontSize: "10px",
            textTransform: "uppercase", letterSpacing: "0.05em",
            background: `color-mix(in oklab, var(--state-${stateKey}) 18%, transparent)`,
            color: `var(--state-${stateKey})`,
          }}>
            ● {agent.state}
          </span>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {/* Metrics */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1px",
          borderBottom: "1px solid var(--panel-border)", background: "var(--panel-border)",
        }}>
          <Metric icon={Timer} label="elapsed" value={`${(agent.elapsedMs / 1000).toFixed(1)}s`} />
          <Metric icon={RotateCw} label="retries" value={String(agent.retryCount)} accent={agent.retryCount > 0} />
          <Metric icon={Zap} label="progress" value={`${agent.progress}%`} />
        </div>

        {/* Current task */}
        <Section title="current task">
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "11.5px", color: agent.currentTask === "—" ? "var(--muted-foreground)" : "color-mix(in oklab, var(--foreground) 85%, transparent)" }}>
            {agent.currentTask === "—" ? "Waiting for orchestrator…" : agent.currentTask}
          </p>
        </Section>

        {/* Pending tasks */}
        {agent.pendingTasks.length > 0 && (
          <Section title={`pending (${agent.pendingTasks.length})`}>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "4px" }}>
              {agent.pendingTasks.map((t, i) => (
                <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontFamily: "var(--font-mono)", fontSize: "11.5px", color: "var(--muted-foreground)" }}>
                  <span style={{ marginTop: "6px", width: "4px", height: "4px", borderRadius: "50%", flexShrink: 0, background: "color-mix(in oklab, var(--muted-foreground) 60%, transparent)" }} />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Files */}
        {(agent.filesCreated.length > 0 || agent.filesModified.length > 0) && (
          <Section title="files">
            {agent.filesCreated.map((f) => (
              <div key={f} style={{ display: "flex", alignItems: "center", gap: "8px", fontFamily: "var(--font-mono)", fontSize: "11.5px" }}>
                <FilePlus2 style={{ width: "12px", height: "12px", color: "var(--state-completed)" }} />
                <span style={{ color: "color-mix(in oklab, var(--foreground) 85%, transparent)" }}>{f}</span>
                <span style={{ marginLeft: "auto", fontSize: "10px", color: "var(--muted-foreground)" }}>new</span>
              </div>
            ))}
            {agent.filesModified.map((f) => (
              <div key={f} style={{ display: "flex", alignItems: "center", gap: "8px", fontFamily: "var(--font-mono)", fontSize: "11.5px" }}>
                <FileCode2 style={{ width: "12px", height: "12px", color: "var(--state-waiting)" }} />
                <span style={{ color: "color-mix(in oklab, var(--foreground) 85%, transparent)" }}>{f}</span>
                <span style={{ marginLeft: "auto", fontSize: "10px", color: "var(--muted-foreground)" }}>modified</span>
              </div>
            ))}
          </Section>
        )}

        {/* Feedback */}
        {agent.feedback.length > 0 && (
          <Section title="reviewer feedback">
            {agent.feedback.map((f, i) => (
              <div key={i} style={{
                borderRadius: "4px",
                border: "1px solid color-mix(in oklab, var(--state-failed) 30%, transparent)",
                background: "color-mix(in oklab, var(--state-failed) 5%, transparent)",
                padding: "6px 8px",
                fontFamily: "var(--font-mono)", fontSize: "11.5px",
                color: "color-mix(in oklab, var(--foreground) 85%, transparent)",
              }}>{f}</div>
            ))}
          </Section>
        )}

        {/* Messages */}
        {myMessages.length > 0 && (
          <Section title={`messages (${myMessages.length})`}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {myMessages.map((m) => {
                const outgoing = m.from === agent.id;
                return (
                  <div key={m.id} style={{
                    borderRadius: "4px",
                    border: "1px solid var(--panel-border)",
                    borderLeft: !outgoing ? `2px solid ${AGENT_COLOR[m.from]}` : undefined,
                    background: "var(--surface)",
                    padding: "6px 8px",
                  }}>
                    <div style={{ marginBottom: "2px", display: "flex", alignItems: "center", gap: "6px", fontFamily: "var(--font-mono)", fontSize: "10px" }}>
                      <span style={{ color: AGENT_COLOR[m.from] }}>{m.from}</span>
                      <span style={{ color: "var(--muted-foreground)" }}>→</span>
                      <span style={{ color: AGENT_COLOR[m.to] }}>{m.to}</span>
                      <span style={{ marginLeft: "auto", color: "var(--muted-foreground)" }}>{m.timestamp}</span>
                    </div>
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: "11.5px", color: "color-mix(in oklab, var(--foreground) 85%, transparent)" }}>{m.body}</p>
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* Reasoning / Thought process */}
        {myReasoning.length > 0 && (
          <div style={{ borderBottom: "1px solid var(--panel-border)" }}>
            <button
              onClick={() => setShowThinking((s) => !s)}
              style={{
                display: "flex", width: "100%", alignItems: "center", gap: "8px",
                padding: "8px 12px", fontFamily: "var(--font-mono)", fontSize: "10px",
                textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted-foreground)",
                cursor: "pointer",
              }}
              onMouseEnter={e => e.target.style.background = "var(--surface-hover)"}
              onMouseLeave={e => e.target.style.background = "transparent"}
            >
              <ChevronDown style={{ width: "12px", height: "12px", transition: "transform 0.2s", transform: showThinking ? "rotate(0)" : "rotate(-90deg)" }} />
              <Brain style={{ width: "12px", height: "12px" }} />
              thought process ({myReasoning.length})
            </button>
            {showThinking && (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", padding: "0 12px 12px" }}>
                {myReasoning.map((r) => (
                  <div key={r.id} style={{
                    borderRadius: "4px",
                    border: "1px dashed var(--panel-border)",
                    background: "color-mix(in oklab, var(--background) 40%, transparent)",
                    padding: "6px 8px",
                  }}>
                    <div style={{ marginBottom: "2px", fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--muted-foreground)" }}>
                      {r.timestamp} · {r.title}
                    </div>
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: "11.5px", fontStyle: "italic", color: "color-mix(in oklab, var(--foreground) 75%, transparent)" }}>{r.body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Error state */}
        {agent.state === "failed" && (
          <Section title="error">
            <div style={{
              borderRadius: "4px",
              border: "1px solid color-mix(in oklab, var(--state-failed) 40%, transparent)",
              background: "color-mix(in oklab, var(--state-failed) 10%, transparent)",
              padding: "10px",
            }}>
              <div style={{ marginBottom: "4px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--state-failed)" }}>
                  ReviewerRejection · attempt {agent.retryCount + 1}
                </span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--muted-foreground)" }}>
                  retry in 3s…
                </span>
              </div>
              <pre style={{
                marginBottom: "8px", whiteSpace: "pre-wrap",
                fontFamily: "var(--font-mono)", fontSize: "11px",
                color: "color-mix(in oklab, var(--foreground) 80%, transparent)",
              }}>
{`at reviewer.evaluate (reviewer.py:142)
at orchestrator.dispatch (core.py:88)
caused by: PolicyViolation("bcrypt rounds < 12")`}
              </pre>
              <div style={{ marginBottom: "8px", fontFamily: "var(--font-mono)", fontSize: "10.5px", color: "var(--muted-foreground)" }}>
                <span style={{ color: "color-mix(in oklab, var(--foreground) 70%, transparent)" }}>suggested:</span> bump bcrypt.gensalt(rounds=12); add EmailStr validator
              </div>
              <button
                onClick={() => onRetry(agent.id)}
                style={{
                  borderRadius: "4px",
                  border: "1px solid color-mix(in oklab, var(--state-failed) 50%, transparent)",
                  background: "color-mix(in oklab, var(--state-failed) 15%, transparent)",
                  padding: "4px 10px",
                  fontFamily: "var(--font-mono)", fontSize: "11px",
                  color: "var(--foreground)", cursor: "pointer",
                }}
                onMouseEnter={e => e.target.style.background = "color-mix(in oklab, var(--state-failed) 25%, transparent)"}
                onMouseLeave={e => e.target.style.background = "color-mix(in oklab, var(--state-failed) 15%, transparent)"}
              >
                <RotateCw style={{ display: "inline", marginRight: "4px", width: "12px", height: "12px" }} />retry agent
              </button>
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

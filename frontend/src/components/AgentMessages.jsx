import { AGENT_COLOR } from "../lib/devteam-data";
import { MessageSquare } from "lucide-react";

export default function AgentMessages({ messages = [] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--panel)" }}>
      <div style={{
        borderBottom: "1px solid var(--panel-border)", padding: "8px 12px",
        fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--muted-foreground)",
      }}>
        agents.communication{" "}
        {messages.length > 0 && (
          <span style={{ color: "color-mix(in oklab, var(--foreground) 40%, transparent)" }}>
            · {messages.length} messages
          </span>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
        {messages.length === 0 ? (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            flex: 1, gap: "8px",
            fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--muted-foreground)",
            textAlign: "center",
          }}>
            <MessageSquare style={{ width: "20px", height: "20px", opacity: 0.35 }} />
            <span>Agent-to-agent messages will appear here</span>
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className="fade-in"
              style={{
                borderRadius: "4px",
                border: "1px solid var(--panel-border)",
                borderLeft: `2px solid ${AGENT_COLOR[m.from]}`,
                background: "var(--surface)",
                padding: "8px 10px",
              }}
            >
              <div style={{
                marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px",
                fontFamily: "var(--font-mono)", fontSize: "10px",
              }}>
                <span style={{ fontWeight: 500, color: AGENT_COLOR[m.from] }}>{m.from}</span>
                <span style={{ color: "var(--muted-foreground)" }}>→</span>
                <span style={{ fontWeight: 500, color: AGENT_COLOR[m.to] }}>{m.to}</span>
                <span style={{ marginLeft: "auto", color: "var(--muted-foreground)" }}>{m.timestamp}</span>
              </div>
              <p style={{
                fontFamily: "var(--font-mono)", fontSize: "11.5px", lineHeight: "1.65",
                color: "color-mix(in oklab, var(--foreground) 85%, transparent)",
              }}>{m.body}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

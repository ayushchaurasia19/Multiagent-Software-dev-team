import { AGENT_COLOR } from "../lib/devteam-data";
import { FileCode2, FolderOpen, FolderSearch } from "lucide-react";

export default function WorkspaceStrip({ files = [], onOpenFile, workDir }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--panel)" }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: "1px solid var(--panel-border)", padding: "8px 12px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--muted-foreground)" }}>
            workspace.recent
          </span>
          {workDir && (
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: "10px",
              color: "var(--primary)",
              background: "color-mix(in oklab, var(--primary) 10%, transparent)",
              borderRadius: "3px", padding: "1px 6px",
              maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {workDir}
            </span>
          )}
        </div>
        {files.length > 0 && (
          <button
            onClick={() => onOpenFile(files[0].path)}
            style={{
              display: "flex", alignItems: "center", gap: "4px",
              fontFamily: "var(--font-mono)", fontSize: "11px",
              color: "var(--primary)", cursor: "pointer",
            }}
            onMouseEnter={e => e.target.style.textDecoration = "underline"}
            onMouseLeave={e => e.target.style.textDecoration = "none"}
          >
            <FolderOpen style={{ width: "12px", height: "12px" }} />open ide
          </button>
        )}
      </div>

      <div style={{ display: "flex", flex: 1, gap: "8px", overflowX: "auto", padding: "12px" }}>
        {files.length === 0 ? (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            flex: 1, gap: "8px",
            fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--muted-foreground)",
            textAlign: "center",
          }}>
            <FolderSearch style={{ width: "20px", height: "20px", opacity: 0.4 }} />
            <span>No files yet — agents will populate this as they write code</span>
          </div>
        ) : (
          files.map((f) => {
            const isFolder = f.type === "folder";
            const Icon = isFolder ? FolderOpen : FileCode2;
            const subItems = isFolder && f.children ? `${f.children.length} items` : "File";
            
            return (
              <button
                key={f.path}
                onClick={() => onOpenFile(isFolder ? null : f.path)}
                style={{
                  display: "flex", flexDirection: "column", justifyContent: "space-between",
                  width: "224px", flexShrink: 0,
                  borderRadius: "4px", border: "1px solid var(--panel-border)",
                  background: "var(--surface)", padding: "10px 12px",
                  transition: "all 0.15s", cursor: "pointer", textAlign: "left",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = "color-mix(in oklab, var(--primary) 50%, transparent)";
                  e.currentTarget.style.background = "var(--surface-hover)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = "var(--panel-border)";
                  e.currentTarget.style.background = "var(--surface)";
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                  <Icon style={{ marginTop: "2px", width: "14px", height: "14px", flexShrink: 0, color: isFolder ? "var(--state-waiting)" : "var(--muted-foreground)" }} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="truncate" style={{ fontFamily: "var(--font-mono)", fontSize: "11.5px", color: "var(--foreground)" }}>
                      {f.name ?? f.path}
                    </div>
                    <div style={{ marginTop: "2px", fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--muted-foreground)" }}>
                      {subItems}
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

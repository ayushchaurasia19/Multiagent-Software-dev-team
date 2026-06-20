import { useMemo, useState, useEffect } from "react";
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from "react-resizable-panels";
import { AGENT_COLOR } from "../lib/devteam-data";
import { ArrowLeft, ChevronDown, ChevronRight, File, Folder, FolderOpen, Search, X } from "lucide-react";

const API_BASE = "http://127.0.0.1:8000/api";

// ── Lightweight syntax highlighter ──
const KEYWORDS = {
  python: ["def", "class", "from", "import", "return", "if", "elif", "else", "for", "while", "async", "await", "with", "as", "in", "not", "and", "or", "True", "False", "None", "pass", "raise", "try", "except", "finally", "lambda", "yield", "self"],
  jsx: ["import", "from", "export", "default", "function", "const", "let", "var", "return", "if", "else", "for", "while", "class", "extends", "new", "this", "true", "false", "null", "undefined", "async", "await", "try", "catch", "finally", "throw"],
};
KEYWORDS.javascript = KEYWORDS.jsx;
KEYWORDS.typescript = KEYWORDS.jsx;
KEYWORDS.tsx = KEYWORDS.jsx;

function tokenize(code, lang) {
  if (lang === "markdown") {
    return code.split(/(^#+ .*$|`[^`]+`|\*\*[^*]+\*\*)/m).filter(Boolean).map((s) => {
      if (/^#+ /.test(s)) return { text: s, color: "var(--agent-planner)" };
      if (/^`.+`$/.test(s)) return { text: s, color: "var(--agent-backend)" };
      if (/^\*\*.+\*\*$/.test(s)) return { text: s, color: "var(--state-completed)" };
      return { text: s };
    });
  }
  const kws = KEYWORDS[lang] ?? [];
  const re = /(#.*?$|\/\/.*?$|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b\d+(?:\.\d+)?\b|\b[A-Za-z_][A-Za-z0-9_]*\b|[^\w\s]+|\s+)/gm;
  const out = [];
  let m;
  while ((m = re.exec(code)) !== null) {
    const t = m[0];
    if (/^(#|\/\/|\/\*)/.test(t)) out.push({ text: t, color: "var(--muted-foreground)" });
    else if (/^["'`]/.test(t)) out.push({ text: t, color: "var(--state-completed)" });
    else if (/^\d/.test(t)) out.push({ text: t, color: "var(--agent-tester)" });
    else if (kws.includes(t)) out.push({ text: t, color: "var(--agent-planner)" });
    else if (/^[A-Z]/.test(t) && /^[A-Za-z_][A-Za-z0-9_]*$/.test(t)) out.push({ text: t, color: "var(--agent-backend)" });
    else out.push({ text: t });
  }
  return out;
}

function CodeHighlight({ code, language }) {
  const tokens = tokenize(code, language);
  return (
    <code>
      {tokens.map((t, i) => (
        <span key={i} style={t.color ? { color: t.color } : undefined}>{t.text}</span>
      ))}
    </code>
  );
}

// ── File tree node ──
function nodeMatches(node, q) {
  if (node.name.toLowerCase().includes(q)) return true;
  if (node.children) return node.children.some((c) => nodeMatches(c, q));
  return false;
}

function TreeNode({ node, depth, onOpen, activePath, query }) {
  const [open, setOpen] = useState(true);
  if (query && !nodeMatches(node, query.toLowerCase())) return null;

  if (node.type === "folder") {
    return (
      <div>
        <button
          onClick={() => setOpen((o) => !o)}
          style={{
            display: "flex", width: "100%", alignItems: "center", gap: "4px",
            paddingLeft: `${depth * 12 + 8}px`, paddingTop: "2px", paddingBottom: "2px", paddingRight: "8px",
            fontFamily: "var(--font-mono)", fontSize: "11.5px",
            color: "color-mix(in oklab, var(--foreground) 85%, transparent)",
            cursor: "pointer",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "var(--surface-hover)"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        >
          {open ? <ChevronDown style={{ width: "12px", height: "12px" }} /> : <ChevronRight style={{ width: "12px", height: "12px" }} />}
          {open ? <FolderOpen style={{ width: "14px", height: "14px", color: "var(--state-waiting)" }} /> : <Folder style={{ width: "14px", height: "14px", color: "var(--state-waiting)" }} />}
          <span>{node.name}</span>
        </button>
        {open && node.children?.map((c) => (
          <TreeNode key={c.path} node={c} depth={depth + 1} onOpen={onOpen} activePath={activePath} query={query} />
        ))}
      </div>
    );
  }

  const isActive = node.path === activePath;
  return (
    <button
      onClick={() => onOpen(node.path)}
      style={{
        display: "flex", width: "100%", alignItems: "center", gap: "4px",
        paddingLeft: `${depth * 12 + 24}px`, paddingTop: "2px", paddingBottom: "2px", paddingRight: "8px",
        fontFamily: "var(--font-mono)", fontSize: "11.5px",
        background: isActive ? "var(--accent)" : "transparent",
        color: isActive ? "var(--foreground)" : "color-mix(in oklab, var(--foreground) 75%, transparent)",
        cursor: "pointer",
      }}
      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "var(--surface-hover)"; }}
      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
    >
      <File style={{ width: "14px", height: "14px", color: "var(--muted-foreground)" }} />
      <span className="truncate">{node.name}</span>
    </button>
  );
}

// ── File Explorer sidebar ──
function FileExplorer({ query, setQuery, onOpen, activePath, fileTree }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--panel)" }}>
      <div style={{ borderBottom: "1px solid var(--panel-border)", padding: "8px" }}>
        <div style={{
          marginBottom: "8px", fontFamily: "var(--font-mono)", fontSize: "10px",
          textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted-foreground)",
        }}>explorer</div>
        <div style={{ position: "relative" }}>
          <Search style={{
            position: "absolute", left: "8px", top: "50%", transform: "translateY(-50%)",
            width: "12px", height: "12px", color: "var(--muted-foreground)",
          }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="search files…"
            style={{
              width: "100%", borderRadius: "4px", border: "1px solid var(--panel-border)",
              background: "var(--surface)", padding: "4px 8px 4px 28px",
              fontFamily: "var(--font-mono)", fontSize: "11px",
              color: "var(--foreground)",
            }}
          />
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", paddingTop: "4px" }}>
        {fileTree.map((n) => (
          <TreeNode key={n.path} node={n} depth={0} onOpen={onOpen} activePath={activePath} query={query} />
        ))}
      </div>
    </div>
  );
}

// ── Main Workspace View ──
export default function WorkspaceView({ initialPath, onBack }) {
  const [tabs, setTabs] = useState([initialPath].filter(Boolean));
  const [active, setActive] = useState(initialPath);
  const [query, setQuery] = useState("");
  const [fileTree, setFileTree] = useState([]);
  const [fileContents, setFileContents] = useState({});

  useEffect(() => {
    const fetchTree = async () => {
      try {
        const res = await fetch(`${API_BASE}/workspace`);
        if (res.ok) {
          const { files } = await res.json();
          setFileTree(files);
        }
      } catch {}
    };
    fetchTree();
    const id = setInterval(fetchTree, 3000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (active && !fileContents[active]) {
      fetch(`${API_BASE}/workspace/file?path=${encodeURIComponent(active)}`)
        .then(r => r.json())
        .then(data => {
          setFileContents(prev => ({...prev, [active]: data.content}));
        })
        .catch(() => {});
    }
  }, [active, fileContents]);

  const activeFileContent = fileContents[active];
  const ext = active ? active.split('.').pop() : "";
  const language = ext === "py" ? "python" : (ext === "js" || ext === "jsx") ? "jsx" : ext === "md" ? "markdown" : "text";

  const openFile = (path) => {
    setTabs((t) => (t.includes(path) ? t : [...t, path]));
    setActive(path);
  };

  const closeTab = (path) => {
    setTabs((prev) => {
      const next = prev.filter((p) => p !== path);
      if (active === path) setActive(next[next.length - 1] ?? "");
      if (next.length === 0) onBack();
      return next;
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--background)", fontFamily: "var(--font-sans)" }}>
      {/* Header */}
      <header style={{
        display: "flex", height: "40px", flexShrink: 0, alignItems: "center", gap: "8px",
        borderBottom: "1px solid var(--panel-border)", background: "var(--panel)", padding: "0 8px",
      }}>
        <button
          onClick={onBack}
          style={{
            display: "flex", alignItems: "center", gap: "6px",
            borderRadius: "4px", border: "1px solid var(--panel-border)",
            background: "var(--surface)", padding: "4px 8px",
            fontFamily: "var(--font-mono)", fontSize: "11px",
            color: "var(--foreground)", cursor: "pointer",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "var(--surface-hover)"}
          onMouseLeave={e => e.currentTarget.style.background = "var(--surface)"}
        >
          <ArrowLeft style={{ width: "12px", height: "12px" }} />back to dashboard
        </button>
        <div style={{ marginLeft: "8px", fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--muted-foreground)" }}>
          workspace
        </div>
        <div style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: "10.5px", color: "var(--muted-foreground)" }}>
          {tabs.length} open
        </div>
      </header>

      {/* Content */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <PanelGroup direction="horizontal" style={{ display: "flex", height: "100%", width: "100%" }}>
          <Panel defaultSize={20} minSize={12} collapsible style={{ minWidth: 0 }}>
            <FileExplorer query={query} setQuery={setQuery} onOpen={openFile} activePath={active} fileTree={fileTree} />
          </Panel>
          <PanelResizeHandle className="resize-handle" />
          <Panel defaultSize={80} minSize={40} style={{ minWidth: 0 }}>
            <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--background)" }}>
              {/* Tab bar */}
              <div style={{
                display: "flex", height: "36px", flexShrink: 0, alignItems: "flex-end", gap: "1px",
                overflowX: "auto", borderBottom: "1px solid var(--panel-border)", background: "var(--panel)",
              }}>
                {tabs.map((p) => {
                  const isActive = p === active;
                  return (
                    <button
                      key={p}
                      onClick={() => setActive(p)}
                      style={{
                        display: "flex", height: "100%", alignItems: "center", gap: "8px",
                        borderRight: "1px solid var(--panel-border)",
                        padding: "0 12px",
                        fontFamily: "var(--font-mono)", fontSize: "11.5px",
                        background: isActive ? "var(--background)" : "var(--panel)",
                        color: isActive ? "var(--foreground)" : "var(--muted-foreground)",
                        cursor: "pointer",
                      }}
                      onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = "var(--foreground)"; }}
                      onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = "var(--muted-foreground)"; }}
                    >
                      <File style={{ width: "12px", height: "12px" }} />
                      <span>{p.split("/").pop()}</span>
                      <span
                        onClick={(e) => { e.stopPropagation(); closeTab(p); }}
                        style={{
                          borderRadius: "4px", padding: "2px",
                          opacity: 0.5, cursor: "pointer",
                        }}
                        onMouseEnter={ev => { ev.currentTarget.style.opacity = 1; ev.currentTarget.style.background = "var(--surface-hover)"; }}
                        onMouseLeave={ev => { ev.currentTarget.style.opacity = 0.5; ev.currentTarget.style.background = "transparent"; }}
                      >
                        <X style={{ width: "12px", height: "12px" }} />
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Code area */}
              {active ? (
                <div style={{ display: "flex", flex: 1, minHeight: 0, overflow: "auto" }}>
                  {/* Line numbers */}
                  <pre style={{
                    userSelect: "none", borderRight: "1px solid var(--panel-border)",
                    background: "var(--panel)", padding: "12px 8px 12px 12px",
                    textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "11.5px",
                    lineHeight: "1.65", color: "color-mix(in oklab, var(--muted-foreground) 60%, transparent)",
                  }}>
                    {(activeFileContent || "").split("\n").map((_, i) => (
                      <div key={i}>{i + 1}</div>
                    ))}
                  </pre>
                  {/* Code */}
                  <pre style={{
                    flex: 1, overflowX: "auto", padding: "12px 24px 12px 16px",
                    fontFamily: "var(--font-mono)", fontSize: "12px", lineHeight: "1.65",
                    color: "color-mix(in oklab, var(--foreground) 90%, transparent)",
                  }}>
                    <CodeHighlight code={activeFileContent || "Loading..."} language={language} />
                  </pre>
                </div>
              ) : (
                <div style={{
                  display: "flex", flex: 1, alignItems: "center", justifyContent: "center",
                  fontSize: "14px", color: "var(--muted-foreground)",
                }}>no file open</div>
              )}

              {/* Status bar */}
              <div style={{
                display: "flex", height: "24px", flexShrink: 0, alignItems: "center", justifyContent: "space-between",
                borderTop: "1px solid var(--panel-border)", background: "var(--panel)",
                padding: "0 12px", fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--muted-foreground)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  {active && <span>{language}</span>}
                  {active && <span>UTF-8</span>}
                  {active && <span>LF</span>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  {active && <span>active</span>}
                </div>
              </div>
            </div>
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}

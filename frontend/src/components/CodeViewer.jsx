import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const CodeViewer = ({ file, content }) => {
  if (!file) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
        Select a file to view its content
      </div>
    );
  }

  const extension = file.split('.').pop() || '';
  const languageMap = {
    'js': 'javascript',
    'jsx': 'jsx',
    'py': 'python',
    'json': 'json',
    'html': 'html',
    'css': 'css',
    'md': 'markdown'
  };
  const language = languageMap[extension] || 'text';

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
      <div className="code-header" style={{ padding: '8px 16px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', fontSize: '13px', display: 'flex', gap: '8px' }}>
        <span style={{ padding: '4px 8px', background: 'var(--bg-primary)', borderRadius: '4px', border: '1px solid var(--border-color)' }}>{file}</span>
      </div>
      <div style={{ flex: 1, overflow: 'auto', background: 'var(--bg-primary)' }}>
        <SyntaxHighlighter
          language={language}
          style={vscDarkPlus}
          customStyle={{ margin: 0, background: 'transparent', fontSize: '13px' }}
          showLineNumbers={true}
        >
          {content || '// Empty file'}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

export default CodeViewer;

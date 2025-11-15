import React from 'react';
import Editor from '@monaco-editor/react';

const CodeEditor = ({ language, value, onChange }) => {
  return (
    <Editor
      height="100%"
      language={language}
      value={value}
      onChange={onChange}
      theme="vs-dark"
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        lineNumbers: 'on',
        roundedSelection: false,
        scrollBeyondLastLine: false,
        readOnly: false,
        cursorStyle: 'line',
        automaticLayout: true,
        tabSize: 2,
        wordWrap: 'on',
        fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', monospace",
        padding: { top: 16, bottom: 16 },
      }}
      loading={
        <div className="flex items-center justify-center h-full bg-gray-900">
          <div className="text-white font-semibold">Loading Editor...</div>
        </div>
      }
    />
  );
};

export default CodeEditor;

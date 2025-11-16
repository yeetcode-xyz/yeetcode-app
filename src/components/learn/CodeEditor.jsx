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
        fontSize: 20,
        lineNumbers: 'on',
        roundedSelection: false,
        scrollBeyondLastLine: false,
        readOnly: false,
        cursorStyle: 'line',
        automaticLayout: true,
        tabSize: 2,
        wordWrap: 'on',
        fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', monospace",
        padding: { top: 20, bottom: 20 },
        lineHeight: 30,
      }}
      loading={
        <div className="flex items-center justify-center h-full bg-gray-900">
          <div className="text-white font-semibold text-xl">
            Loading Editor...
          </div>
        </div>
      }
    />
  );
};

export default CodeEditor;

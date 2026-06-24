"use client";

import React, { useRef, useState } from "react";
import MonacoEditor, { useMonaco } from "@monaco-editor/react";

interface EditorProps {
  initialContent?: string;
  language?: string;
  onChange?: (value: string | undefined) => void;
}

export function Editor({ initialContent = "", language = "typescript", onChange }: EditorProps) {
  const [content, setContent] = useState(initialContent);

  const handleEditorChange = (value: string | undefined) => {
    setContent(value || "");
    if (onChange) {
      onChange(value);
    }
  };

  return (
    <div className="w-full h-full min-h-[500px] border rounded-md overflow-hidden">
      <MonacoEditor
        height="100%"
        language={language}
        theme="vs-dark"
        value={content}
        onChange={handleEditorChange}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          wordWrap: "on",
          padding: { top: 16 },
        }}
      />
    </div>
  );
}

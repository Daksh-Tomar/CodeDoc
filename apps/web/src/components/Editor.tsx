"use client";

import React, { useRef, useState, useEffect } from "react";
import MonacoEditor, { useMonaco } from "@monaco-editor/react";
import { useDocumentSocket } from "../hooks/useDocumentSocket";

interface EditorProps {
  documentId: string;
  initialContent?: string;
  language?: string;
  onChange?: (value: string | undefined) => void;
}

export function Editor({ documentId, initialContent = "", language = "typescript", onChange }: EditorProps) {
  const [content, setContent] = useState(initialContent);
  const { isConnected, saveDocument } = useDocumentSocket({ documentId });
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleEditorChange = (value: string | undefined) => {
    setContent(value || "");
    if (onChange) {
      onChange(value);
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      saveDocument(value || "");
    }, 1500); // Debounce save by 1.5s
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="w-full h-full min-h-[500px] border rounded-md overflow-hidden relative">
      {!isConnected && (
        <div className="absolute top-2 right-2 z-10 bg-red-500/80 text-white text-xs px-2 py-1 rounded">
          Disconnected
        </div>
      )}
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

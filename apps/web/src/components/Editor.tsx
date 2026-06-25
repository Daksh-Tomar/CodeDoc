"use client";

import React, { useRef, useState, useEffect } from "react";
import MonacoEditor, { useMonaco, OnMount } from "@monaco-editor/react";
import { Socket } from "socket.io-client";
import { ActiveUser, CursorPosition } from "../hooks/useDocumentSocket";

interface EditorProps {
  documentId: string;
  initialContent?: string;
  language?: string;
  onChange?: (value: string | undefined) => void;
  socket: Socket | null;
  isConnected: boolean;
  activeUsers: ActiveUser[];
  saveDocument: (content: string) => void;
  teamViewEnabled: boolean;
}

export function Editor({ 
  documentId, 
  initialContent = "", 
  language = "typescript", 
  onChange,
  socket,
  isConnected,
  activeUsers,
  saveDocument,
  teamViewEnabled
}: EditorProps) {
  const [content, setContent] = useState(initialContent);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const decorationsCollectionRef = useRef<any>(null);
  const remoteCursorsRef = useRef<Record<string, CursorPosition>>({});

  // Dynamic CSS injection for cursor colors
  useEffect(() => {
    const styleId = 'remote-cursors-styles';
    let styleEl = document.getElementById(styleId);
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }

    let css = '';
    activeUsers.forEach(user => {
      // The cursor caret
      css += `
        .remote-cursor-${user.userId} {
          border-left: 2px solid ${user.color};
          position: relative;
          z-index: 9;
        }
        .remote-cursor-${user.userId}::after {
          content: '${user.email.split('@')[0]}';
          position: absolute;
          top: -18px;
          left: -2px;
          background: ${user.color};
          color: white;
          font-size: 10px;
          padding: 2px 4px;
          border-radius: 2px;
          white-space: nowrap;
          pointer-events: none;
        }
        .remote-selection-${user.userId} {
          background-color: ${user.color}40; /* 40 is hex for 25% opacity */
        }
      `;
    });
    styleEl.innerHTML = css;
  }, [activeUsers]);

  const currentSocketRef = useRef<Socket | null>(socket);

  useEffect(() => {
    currentSocketRef.current = socket;
  }, [socket]);

  // Handle incoming cursor movements
  useEffect(() => {
    if (!socket) return;

    const handleCursorMoved = (data: { userId: string, cursor: CursorPosition }) => {
      console.log('Received cursorMoved:', data);
      remoteCursorsRef.current[data.userId] = data.cursor;
      updateDecorations();
    };

    socket.on('cursorMoved', handleCursorMoved);

    return () => {
      socket.off('cursorMoved', handleCursorMoved);
    };
  }, [socket, activeUsers, teamViewEnabled]);

  const updateDecorations = () => {
    if (!editorRef.current || !monacoRef.current || !decorationsCollectionRef.current) return;
    
    if (!teamViewEnabled) {
      decorationsCollectionRef.current.set([]);
      return;
    }

    const newDecorations: any[] = [];

    activeUsers.forEach(user => {
      const pos = remoteCursorsRef.current[user.userId];
      if (!pos) return;

      console.log('Rendering decoration for user:', user.userId, 'at', pos);

      // Add selection highlight if there is a selection
      if (pos.selectionStartLineNumber && 
          (pos.selectionStartLineNumber !== pos.lineNumber || pos.selectionStartColumn !== pos.column)) {
        newDecorations.push({
          range: new monacoRef.current.Range(
            pos.selectionStartLineNumber, 
            pos.selectionStartColumn, 
            pos.lineNumber, 
            pos.column
          ),
          options: {
            className: `remote-selection-${user.userId}`,
          }
        });
      }

      // Add the caret cursor
      newDecorations.push({
        range: new monacoRef.current.Range(pos.lineNumber, pos.column, pos.lineNumber, pos.column),
        options: {
          className: `remote-cursor-${user.userId}`,
          stickiness: monacoRef.current.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
        }
      });
    });

    console.log('Setting new decorations:', newDecorations);
    decorationsCollectionRef.current.set(newDecorations);
  };

  const handleEditorChange = (value: string | undefined) => {
    setContent(value || "");
    if (onChange) onChange(value);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      saveDocument(value || "");
    }, 1500); 
  };

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    decorationsCollectionRef.current = editor.createDecorationsCollection();

    // Listen to local cursor changes to broadcast to others
    editor.onDidChangeCursorSelection((e) => {
      if (currentSocketRef.current && currentSocketRef.current.connected) {
        console.log('Emitting cursorMove:', e.selection);
        currentSocketRef.current.emit('cursorMove', {
          documentId,
          cursor: {
            lineNumber: e.selection.positionLineNumber,
            column: e.selection.positionColumn,
            selectionStartLineNumber: e.selection.selectionStartLineNumber,
            selectionStartColumn: e.selection.selectionStartColumn,
          }
        });
      }
    });

    updateDecorations();
  };

  useEffect(() => {
    updateDecorations();
  }, [teamViewEnabled]);

  return (
    <div className="w-full h-full min-h-[500px] border rounded-md overflow-hidden relative border-zinc-800">
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
        onMount={handleEditorMount}
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

"use client";

import React, { useRef, useState, useEffect } from "react";
import MonacoEditor, { useMonaco, OnMount } from "@monaco-editor/react";
import { Socket } from "socket.io-client";
import { ActiveUser, CursorPosition } from "../hooks/useDocumentSocket";
import * as Y from 'yjs';
import { MonacoBinding } from 'y-monaco';

interface EditorProps {
  documentId: string;
  initialContent?: string;
  language?: string;
  onChange?: (value: string | undefined) => void;
  socket: Socket | null;
  isConnected: boolean;
  isConnected: boolean;
  activeUsers: ActiveUser[];
  teamViewEnabled: boolean;
  editorRef: React.MutableRefObject<any>;
}

export function Editor({ 
  documentId, 
  language = "typescript", 
  onChange,
  socket,
  isConnected,
  activeUsers,
  teamViewEnabled,
  editorRef: externalEditorRef
}: EditorProps) {
  const [ydoc] = useState(() => new Y.Doc());
  const bindingRef = useRef<any>(null);
  
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
      if (user.socketId === socket?.id) return;
      // The cursor caret
      css += `
        .remote-cursor-${user.socketId} {
          border-left: 2px solid ${user.color};
          position: relative;
          z-index: 9;
        }
        .remote-cursor-${user.socketId}::after {
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
        .remote-selection-${user.socketId} {
          background-color: ${user.color}40; /* 40 is hex for 25% opacity */
        }
      `;
    });
    styleEl.innerHTML = css;
  }, [activeUsers, socket]);

  const currentSocketRef = useRef<Socket | null>(socket);

  useEffect(() => {
    currentSocketRef.current = socket;
  }, [socket]);

  // Yjs Synchronization
  useEffect(() => {
    if (!socket) return;
    
    const handleLocalUpdate = (update: Uint8Array, origin: any) => {
      if (origin !== 'server') {
        socket.emit('yjsUpdate', { documentId, update: Array.from(update) });
      }
    };
    
    ydoc.on('update', handleLocalUpdate);
    
    const handleYjsInit = (data: { documentId: string, update: number[] }) => {
      if (data.documentId !== documentId) return;
      Y.applyUpdate(ydoc, new Uint8Array(data.update), 'socket');

      // Sync local state back to server to resolve any offline edits or server restarts!
      const localState = Y.encodeStateAsUpdate(ydoc);
      socket.emit('yjsUpdate', { documentId: documentId, update: Array.from(localState) });
    };

    const handleYjsUpdate = (data: { documentId: string, update: number[] }) => {
      if (data.documentId !== documentId) return;
      Y.applyUpdate(ydoc, new Uint8Array(data.update), 'server');
    };

    socket.on('yjsInit', handleYjsInit);
    socket.on('yjsUpdate', handleYjsUpdate);

    // Request full state now that listeners are attached
    socket.emit('requestYjsInit', { documentId });

    return () => {
      ydoc.off('update', handleLocalUpdate);
      socket.off('yjsInit', handleYjsInit);
      socket.off('yjsUpdate', handleYjsUpdate);
    };
  }, [socket, documentId, ydoc]);

  // Handle incoming custom remote cursor movements (Phase 3)
  useEffect(() => {
    if (!socket) return;

    const handleCursorMoved = (data: { userId: string, socketId: string, cursor: CursorPosition }) => {
      remoteCursorsRef.current[data.socketId] = data.cursor;
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
    console.log("Updating decorations. Active users:", activeUsers.map(u => u.socketId), "Remote cursors:", remoteCursorsRef.current);

    activeUsers.forEach(user => {
      if (user.socketId === socket?.id) return;
      const pos = remoteCursorsRef.current[user.socketId];
      if (!pos) return;

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
            className: `remote-selection-${user.socketId}`,
          }
        });
      }

      // Add the caret cursor
      // We expand the range by 1 column so Monaco definitely creates a DOM element
      newDecorations.push({
        range: new monacoRef.current.Range(pos.lineNumber, pos.column, pos.lineNumber, pos.column + 1),
        options: {
          className: `remote-cursor-${user.socketId}`,
          stickiness: monacoRef.current.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
        }
      });
    });

    // Mock Inline Comment Decoration for Code Reviews
    newDecorations.push({
      range: new monacoRef.current.Range(10, 1, 10, 1),
      options: {
        isWholeLine: true,
        className: 'bg-yellow-500/20',
        glyphMarginClassName: 'fas fa-comment text-yellow-500', // Assumes FontAwesome or similar
        hoverMessage: { value: '**Daksh:** We need to refactor this logic.\n\n*Aryan:* Agreed, working on it! [Reply]*' }
      }
    });

    decorationsCollectionRef.current.set(newDecorations);
  };

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    
    // Attach editor instance to external ref so parent can query it for AI context
    if (externalEditorRef) {
      externalEditorRef.current = editor;
    }

    decorationsCollectionRef.current = editor.createDecorationsCollection();

    // Bind Yjs to Monaco
    const ytext = ydoc.getText('monaco');
    bindingRef.current = new MonacoBinding(ytext, editor.getModel()!, new Set([editor]), null);

    // Listen to local cursor changes to broadcast to others
    editor.onDidChangeCursorSelection((e) => {
      if (currentSocketRef.current && currentSocketRef.current.connected) {
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
  }, [teamViewEnabled, activeUsers]);

  // Clean up binding on unmount
  useEffect(() => {
    return () => {
      if (bindingRef.current) {
        try {
          bindingRef.current.destroy();
        } catch (e) {
          console.warn("Yjs binding destroy warning:", e);
        }
        bindingRef.current = null;
      }
    };
  }, []);

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
        onMount={handleEditorMount}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          wordWrap: "on",
          padding: { top: 16 },
          glyphMargin: true,
        }}
      />
    </div>
  );
}

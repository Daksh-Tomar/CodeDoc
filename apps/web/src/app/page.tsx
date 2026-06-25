"use client";

import { useState } from "react";
import { Editor } from "@/components/Editor";
import { useDocumentSocket } from "@/hooks/useDocumentSocket";

export default function Home() {
  const documentId = "a0ddcbc3-9105-47ec-bae2-beaf0f4547ce";
  const [teamViewEnabled, setTeamViewEnabled] = useState(true);
  
  const { socket, isConnected, activeUsers, saveDocument } = useDocumentSocket({ documentId });

  return (
    <div className="flex h-screen w-full bg-zinc-950 text-zinc-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-800 bg-zinc-900 flex flex-col">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <h1 className="font-bold text-lg tracking-tight">CodeDoc</h1>
        </div>
        <div className="flex-1 p-2 overflow-y-auto">
          <div className="text-sm font-medium text-zinc-400 mb-2 px-2 uppercase tracking-wider">Explorer</div>
          <div className="space-y-1">
            <div className="px-2 py-1 hover:bg-zinc-800 rounded cursor-pointer text-sm flex items-center gap-2 text-blue-400 bg-zinc-800/50">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
              main.ts
            </div>
          </div>
        </div>
      </aside>

      {/* Main Editor Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <div className="h-14 border-b border-zinc-800 bg-zinc-950 flex items-center px-6 justify-between">
          <div className="flex items-center gap-4">
            <div className="flex -space-x-2">
              {activeUsers.map(user => (
                <div 
                  key={user.socketId}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 border-zinc-950 text-white"
                  style={{ backgroundColor: user.color }}
                  title={user.email}
                >
                  {user.email.charAt(0).toUpperCase()}
                </div>
              ))}
            </div>
            {activeUsers.length > 0 && (
              <span className="text-sm text-zinc-400">
                {activeUsers.length} user{activeUsers.length !== 1 ? 's' : ''} online
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-400">Team View</span>
            <button 
              onClick={() => setTeamViewEnabled(!teamViewEnabled)}
              className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-1 ${teamViewEnabled ? 'bg-blue-500' : 'bg-zinc-700'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${teamViewEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="h-10 border-b border-zinc-800 bg-zinc-900 flex items-center px-4 gap-2">
          <div className="px-4 py-1.5 bg-zinc-800 text-sm rounded-t-md border-t border-blue-500 text-zinc-200">
            main.ts
          </div>
        </div>
        
        {/* Editor Wrapper */}
        <div className="flex-1 p-4 bg-zinc-950">
          <Editor 
            documentId={documentId} 
            initialContent="// Welcome to CodeDoc Workspace" 
            language="typescript" 
            socket={socket}
            isConnected={isConnected}
            activeUsers={activeUsers}
            saveDocument={saveDocument}
            teamViewEnabled={teamViewEnabled}
          />
        </div>
      </main>
    </div>
  );
}

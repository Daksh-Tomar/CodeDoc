"use client";

import { useState, useRef } from "react";
import dynamic from 'next/dynamic';
import { AiChatSidebar } from '@/components/AiChatSidebar';
import { Notifications } from '@/components/Notifications';
import { ActivityFeed } from '@/components/ActivityFeed';
import { AnalyticsDashboard } from '@/components/AnalyticsDashboard';
const Editor = dynamic(() => import('@/components/Editor').then(mod => mod.Editor), {
  ssr: false,
});
const TerminalPanel = dynamic(() => import('@/components/TerminalPanel').then(mod => mod.TerminalPanel), {
  ssr: false,
});
import { useDocumentSocket, defaultToken } from "@/hooks/useDocumentSocket";

export default function Home() {
  const documentId = "a0ddcbc3-9105-47ec-bae2-beaf0f4547ce";
  const [teamViewEnabled, setTeamViewEnabled] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const editorRef = useRef<any>(null);
  
  const { socket, isConnected, activeUsers } = useDocumentSocket({ documentId });

  // Function to extract rich context from Monaco
  const getEditorContext = () => {
    if (!editorRef.current) return {};
    
    const editor = editorRef.current;
    const model = editor.getModel();
    const selection = editor.getSelection();
    const position = editor.getPosition();
    
    let selectionText = '';
    if (selection && !selection.isEmpty()) {
      selectionText = model?.getValueInRange(selection) || '';
    }

    return {
      fileName: 'main.ts',
      documentContent: model?.getValue() || '',
      cursorLine: position?.lineNumber || 1,
      cursorColumn: position?.column || 1,
      selectionText
    };
  };

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
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 mr-4 border-r border-zinc-800 pr-4">
              <span className="text-sm text-zinc-400">Team View</span>
              <button 
                onClick={() => setTeamViewEnabled(!teamViewEnabled)}
                className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-1 ${teamViewEnabled ? 'bg-blue-500' : 'bg-zinc-700'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${teamViewEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
            
            <button
              onClick={() => setIsActivityOpen(!isActivityOpen)}
              className={`text-sm px-3 py-1.5 rounded-md flex items-center gap-2 transition-colors mr-2 ${
                isActivityOpen ? 'bg-purple-600/20 text-purple-400' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Activity
            </button>

            <button
              onClick={() => setIsAnalyticsOpen(!isAnalyticsOpen)}
              className={`text-sm px-3 py-1.5 rounded-md flex items-center gap-2 transition-colors mr-2 ${
                isAnalyticsOpen ? 'bg-orange-600/20 text-orange-400' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              Stats
            </button>
            
            <button
              onClick={() => setIsTerminalOpen(!isTerminalOpen)}
              className={`text-sm px-3 py-1.5 rounded-md flex items-center gap-2 transition-colors mr-2 ${
                isTerminalOpen ? 'bg-blue-600/20 text-blue-400' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>
              Terminal
            </button>
            
            <button
              onClick={() => setIsChatOpen(!isChatOpen)}
              className={`text-sm px-3 py-1.5 rounded-md flex items-center gap-2 transition-colors mr-4 ${
                isChatOpen ? 'bg-emerald-600/20 text-emerald-400' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
              AI Assistant
            </button>

            <Notifications />
          </div>
        </div>

        {isAnalyticsOpen && <AnalyticsDashboard onClose={() => setIsAnalyticsOpen(false)} />}

        {/* Tabs */}
        <div className="h-10 border-b border-zinc-800 bg-zinc-900 flex items-center px-4 gap-2">
          <div className="px-4 py-1.5 bg-zinc-800 text-sm rounded-t-md border-t border-blue-500 text-zinc-200">
            main.ts
          </div>
        </div>
        
        {/* Editor Wrapper */}
        <div className="flex-1 bg-zinc-950 relative flex flex-col overflow-hidden">
          <div className="flex-1 min-h-0 flex p-4 pb-0">
            <div className="flex-1 min-w-0">
              <Editor 
                documentId={documentId} 
                initialContent="// Welcome to CodeDoc Workspace" 
                language="typescript" 
                socket={socket}
                isConnected={isConnected}
                activeUsers={activeUsers}
                teamViewEnabled={teamViewEnabled}
                editorRef={editorRef}
              />
            </div>
            
            {isChatOpen && (
              <AiChatSidebar 
                documentId={documentId}
                token={typeof window !== 'undefined' ? (localStorage.getItem('test_jwt_token') || localStorage.getItem('jwt_token') || defaultToken) : defaultToken}
                onClose={() => setIsChatOpen(false)}
                getEditorContext={getEditorContext}
              />
            )}

            {isActivityOpen && (
              <ActivityFeed workspaceId="default-workspace" />
            )}
          </div>
          
          {isTerminalOpen && (
            <div className="h-64 shrink-0 flex mt-4 border-t border-zinc-800">
              <TerminalPanel workspaceId="default-workspace" />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

'use client';

import { useState, useRef, useEffect, use } from "react";
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Home } from 'lucide-react';
import Link from 'next/link';
import { AiChatSidebar } from '@/components/AiChatSidebar';
import { ActivityFeed } from '@/components/ActivityFeed';
import { AnalyticsDashboard } from '@/components/AnalyticsDashboard';
const Editor = dynamic(() => import('@/components/Editor').then(mod => mod.Editor), {
  ssr: false,
});
const TerminalPanel = dynamic(() => import('@/components/TerminalPanel').then(mod => mod.TerminalPanel), {
  ssr: false,
});
import { useDocumentSocket } from "@/hooks/useDocumentSocket";
import { FileTree } from "@/components/FileTree";
import { MembersModal } from "@/components/MembersModal";
import { SettingsModal } from "@/components/SettingsModal";

export default function WorkspaceEditor({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = use(params);
  const router = useRouter();
  const { user, token, isLoading } = useAuth();
  
  const [workspace, setWorkspace] = useState<any>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);
  const [activeFileName, setActiveFileName] = useState("main.ts");
  const [teamViewEnabled, setTeamViewEnabled] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const editorRef = useRef<any>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (token && workspaceId) {
      fetch(`http://localhost:3001/workspaces/${workspaceId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch workspace');
        return res.json();
      })
      .then(data => {
        setWorkspace(data);
        if (data.projects && data.projects.length > 0) {
          setProjectId(data.projects[0].id);
        }
      })
      .catch(err => {
        console.error(err);
        router.push('/dashboard');
      });
    }
  }, [token, workspaceId, router]);
  
  const { socket, isConnected, activeUsers, projectUsers, fileSystemEvent } = useDocumentSocket({ 
    projectId: projectId || '', 
    workspaceId, 
    documentId: activeDocumentId 
  });

  useEffect(() => {
    if (!activeDocumentId || !projectId || !token) return;
    fetch(`http://localhost:3001/projects/${projectId}/files/${encodeURIComponent(activeDocumentId)}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      if (data && data.name) setActiveFileName(data.name);
    })
    .catch(console.error);
  }, [activeDocumentId, projectId, token]);

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
      fileName: activeFileName,
      documentContent: model?.getValue() || '',
      cursorLine: position?.lineNumber || 1,
      cursorColumn: position?.column || 1,
      selectionText
    };
  };

  if (isLoading || !user || !workspace || !projectId) {
    return <div className="flex h-screen items-center justify-center bg-zinc-950 text-white">Loading Workspace...</div>;
  }

  return (
    <div className="flex h-screen w-full bg-zinc-950 text-zinc-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-800 bg-zinc-900 flex flex-col">
        <div className="p-4 border-b border-zinc-800 flex items-center gap-3">
          <Link href="/dashboard" className="text-zinc-400 hover:text-white transition-colors" title="Back to Dashboard">
            <Home className="w-5 h-5" />
          </Link>
          <h1 className="font-bold text-lg tracking-tight truncate" title={workspace.name}>{workspace.name}</h1>
        </div>
        <div className="flex-1 p-2 overflow-y-auto">
          <FileTree 
            projectId={projectId} 
            projectUsers={projectUsers} 
            activeDocumentId={activeDocumentId}
            onFileSelect={(fileId) => setActiveDocumentId(fileId)}
            fileSystemEvent={fileSystemEvent}
          />
        </div>
      </aside>

      {/* Main Editor Area */}
      <main className="flex-1 flex flex-col min-w-0">
        <div className="h-14 border-b border-zinc-800 bg-zinc-950 flex items-center px-6 justify-between">
          <div className="flex items-center gap-4">
            <div className="flex -space-x-2">
              {projectUsers.map((u, i) => (
                <div 
                  key={u.socketId}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 border-zinc-950 text-white"
                  style={{ backgroundColor: u.color }}
                  title={u.displayName || u.email.split('@')[0]}
                >
                  {(u.displayName || u.email).charAt(0).toUpperCase()}
                </div>
              ))}
            </div>
            {projectUsers.length > 0 && (
              <span className="text-sm text-zinc-400">
                {projectUsers.length} user{projectUsers.length !== 1 ? 's' : ''} online
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsMembersModalOpen(true)}
              className="text-sm px-3 py-1.5 rounded-md flex items-center gap-2 transition-colors mr-2 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            >
              Members
            </button>
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="text-sm px-3 py-1.5 rounded-md flex items-center gap-2 transition-colors mr-2 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            >
              Settings
            </button>
            <button
              onClick={() => setIsActivityOpen(!isActivityOpen)}
              className={`text-sm px-3 py-1.5 rounded-md flex items-center gap-2 transition-colors mr-2 ${
                isActivityOpen ? 'bg-purple-600/20 text-purple-400' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              Activity
            </button>

            <button
              onClick={() => setIsTerminalOpen(!isTerminalOpen)}
              className={`text-sm px-3 py-1.5 rounded-md flex items-center gap-2 transition-colors mr-2 ${
                isTerminalOpen ? 'bg-blue-600/20 text-blue-400' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              Terminal
            </button>
            
            <button
              onClick={() => setIsChatOpen(!isChatOpen)}
              className={`text-sm px-3 py-1.5 rounded-md flex items-center gap-2 transition-colors mr-4 ${
                isChatOpen ? 'bg-emerald-600/20 text-emerald-400' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              AI Assistant
            </button>
          </div>
        </div>

        {isAnalyticsOpen && <AnalyticsDashboard onClose={() => setIsAnalyticsOpen(false)} />}
        
        {/* Modals */}
        {isMembersModalOpen && (
          <MembersModal 
            workspaceId={workspaceId}
            token={token || ''}
            currentUserRole={workspace.members.find((m: any) => m.userId === user?.id)?.role}
            onClose={() => setIsMembersModalOpen(false)} 
          />
        )}
        
        {isSettingsModalOpen && (
          <SettingsModal 
            workspaceId={workspaceId}
            workspaceName={workspace.name}
            token={token || ''}
            onClose={() => setIsSettingsModalOpen(false)} 
          />
        )}

        <div className="h-10 border-b border-zinc-800 bg-zinc-900 flex items-center px-4 gap-2">
          {activeDocumentId ? (
            <div className="px-4 py-1.5 bg-zinc-800 text-sm rounded-t-md border-t border-blue-500 text-zinc-200">
              {activeFileName}
            </div>
          ) : (
            <div className="text-sm text-zinc-500">No file selected</div>
          )}
        </div>
        
        <div className="flex-1 bg-zinc-950 relative flex flex-col overflow-hidden">
          <div className="flex-1 min-h-0 flex p-4 pb-0">
            <div className="flex-1 min-w-0">
              {activeDocumentId ? (
                <Editor 
                  key={activeDocumentId}
                  documentId={activeDocumentId} 
                  workspaceId={workspaceId}
                  language={activeFileName.endsWith('.ts') || activeFileName.endsWith('.tsx') ? 'typescript' : 'javascript'} 
                  socket={socket}
                  isConnected={isConnected}
                  activeUsers={activeUsers}
                  teamViewEnabled={teamViewEnabled}
                  editorRef={editorRef}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-zinc-500">
                  Select a file from the explorer to start editing
                </div>
              )}
            </div>
            
            {isChatOpen && (
              <AiChatSidebar 
                projectId={projectId}
                filePath={activeDocumentId || ''}
                token={token || ''}
                onClose={() => setIsChatOpen(false)}
                getEditorContext={getEditorContext}
              />
            )}

            {isActivityOpen && (
              <ActivityFeed projectId={projectId} socket={socket} />
            )}
          </div>
          
          {isTerminalOpen && (
            <div className="h-64 shrink-0 flex mt-4 border-t border-zinc-800">
              <TerminalPanel workspaceId={workspaceId} userId={user.id} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

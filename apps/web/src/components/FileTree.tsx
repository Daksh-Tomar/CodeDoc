import React, { useState, useEffect } from 'react';
import { ActiveUser } from '../hooks/useDocumentSocket';
import { defaultToken } from '../hooks/useDocumentSocket';

export interface FileNode {
  id: string;
  name: string;
  type: 'FILE' | 'FOLDER';
  parentId: string | null;
  projectId: string;
}

interface FileTreeProps {
  projectId: string;
  projectUsers: ActiveUser[];
  activeDocumentId: string | null;
  onFileSelect: (fileId: string) => void;
  fileSystemEvent?: { type: string; path: string; timestamp: number } | null;
}

export function FileTree({ projectId, projectUsers, activeDocumentId, onFileSelect, fileSystemEvent }: FileTreeProps) {
  const [files, setFiles] = useState<FileNode[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const fetchFiles = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('test_jwt_token') || defaultToken : defaultToken;
      const res = await fetch(`http://localhost:3001/projects/${projectId}/files`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setFiles(data);
        
        // Auto-expand folders that contain the active document or files that users are in
        const newExpanded = new Set(expandedFolders);
        // We can do auto-expand logic later, just keep it simple for now
        setExpandedFolders(newExpanded);
      }
    } catch (e) {
      console.error("Failed to fetch files", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchFiles();
    }
  }, [projectId]);

  useEffect(() => {
    if (fileSystemEvent) {
      fetchFiles();
    }
  }, [fileSystemEvent]);

  const toggleFolder = (folderId: string) => {
    const next = new Set(expandedFolders);
    if (next.has(folderId)) {
      next.delete(folderId);
    } else {
      next.add(folderId);
    }
    setExpandedFolders(next);
  };

  const createItem = async (type: 'FILE' | 'FOLDER', parentId: string | null) => {
    const name = prompt(`Enter ${type.toLowerCase()} name:`);
    if (!name) return;

    const token = typeof window !== 'undefined' ? localStorage.getItem('test_jwt_token') || defaultToken : defaultToken;
    try {
      const res = await fetch(`http://localhost:3001/projects/${projectId}/files`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name, type, parentId })
      });
      if (res.ok) {
        if (parentId) {
          const next = new Set(expandedFolders);
          next.add(parentId);
          setExpandedFolders(next);
        }
        fetchFiles();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const renderTree = (parentId: string | null = null, depth = 0) => {
    const children = files.filter(f => f.parentId === parentId);
    if (children.length === 0) return null;

    return (
      <div className="space-y-0.5">
        {children.map(node => {
          const isFolder = node.type === 'FOLDER';
          const isExpanded = expandedFolders.has(node.id);
          const isActive = activeDocumentId === node.id;
          
          // Check for active users in this file
          const usersInFile = projectUsers.filter(u => u.documentId === node.id);
          
          let borderStyle = {};
          let tooltip = node.name;
          
          if (usersInFile.length > 0) {
            const firstColor = usersInFile[0].color;
            borderStyle = { borderLeft: `2px solid ${firstColor}` };
            tooltip = `${usersInFile.map(u => u.email).join(', ')} ${usersInFile.length > 1 ? 'are' : 'is'} working on ${node.name}`;
          }

          return (
            <div key={node.id}>
              <div 
                className={`flex items-center gap-1.5 py-1 px-2 rounded-sm cursor-pointer hover:bg-zinc-800/80 transition-colors ${isActive ? 'bg-zinc-800 text-white' : 'text-zinc-400'}`}
                style={{ paddingLeft: `${(depth * 12) + 8}px`, ...borderStyle }}
                onClick={() => isFolder ? toggleFolder(node.id) : onFileSelect(node.id)}
                title={tooltip}
              >
                {isFolder ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill={isExpanded ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-80">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-80">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                )}
                
                <span className="text-sm truncate select-none flex-1">{node.name}</span>
                
                {usersInFile.length > 0 && !isFolder && (
                   <div className="flex -space-x-1 opacity-80">
                     {usersInFile.slice(0, 3).map(u => (
                        <div key={u.socketId} className="w-3 h-3 rounded-full border border-zinc-900" style={{ backgroundColor: u.color }} />
                     ))}
                   </div>
                )}
                
                {isFolder && (
                  <div className="flex gap-1 opacity-0 hover:opacity-100 group-hover:opacity-100 items-center justify-center">
                    <button onClick={(e) => { e.stopPropagation(); createItem('FILE', node.id); }} className="p-0.5 hover:bg-zinc-700 rounded text-zinc-300" title="New File">
                       <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); createItem('FOLDER', node.id); }} className="p-0.5 hover:bg-zinc-700 rounded text-zinc-300" title="New Folder">
                       <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path><line x1="12" y1="11" x2="12" y2="17"></line><line x1="9" y1="14" x2="15" y2="14"></line></svg>
                    </button>
                  </div>
                )}
              </div>
              
              {isFolder && isExpanded && (
                <div>
                  {renderTree(node.id, depth + 1)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-2 py-1 mb-1 flex items-center justify-between text-xs font-semibold text-zinc-400 uppercase tracking-wider group">
        <span>Explorer</span>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => createItem('FILE', null)} className="p-1 hover:bg-zinc-800 rounded" title="New File">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
          </button>
          <button onClick={() => createItem('FOLDER', null)} className="p-1 hover:bg-zinc-800 rounded" title="New Folder">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path><line x1="12" y1="11" x2="12" y2="17"></line><line x1="9" y1="14" x2="15" y2="14"></line></svg>
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {loading ? (
          <div className="px-4 py-2 text-sm text-zinc-500">Loading...</div>
        ) : files.length === 0 ? (
          <div className="px-4 py-2 text-sm text-zinc-500">No files found.</div>
        ) : (
          renderTree(null, 0)
        )}
      </div>
    </div>
  );
}

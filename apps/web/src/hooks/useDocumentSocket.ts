import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export interface CursorPosition {
  lineNumber: number;
  column: number;
  selectionStartLineNumber?: number;
  selectionStartColumn?: number;
}

export interface ActiveUser {
  socketId: string;
  userId: string;
  email: string;
  color: string;
  cursor: CursorPosition | null;
  documentId: string | null;
  projectId?: string;
  workspaceId?: string;
}

interface UseDocumentSocketProps {
  projectId: string;
  workspaceId: string;
  documentId: string | null;
  url?: string;
}

export const defaultToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1Y2MwMDQyNC1lMTczLTRmOTYtODFlYy01MzY2YzY4YmYyZTgiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJpYXQiOjE3ODIzODE2NjcsImV4cCI6MTc4MjQ2ODA2N30.deVnwUVhYM0FzWW7gCmd6eJE_KDo-1iqpU9_14ocf1I';

export function useDocumentSocket({ projectId, workspaceId, documentId, url = 'http://localhost:3001' }: UseDocumentSocketProps) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [projectUsers, setProjectUsers] = useState<ActiveUser[]>([]);
  
  const currentDocIdRef = useRef<string | null>(null);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('test_jwt_token') || defaultToken : defaultToken;

    const socket = io(url, {
      auth: {
        token: token || '',
      },
    });
    
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to socket', socket.id);
      socket.emit('joinProject', { projectId });
      
      if (documentId) {
        socket.emit('joinDocument', { documentId, workspaceId });
        currentDocIdRef.current = documentId;
      }
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from socket');
    });

    socket.on('activeUsers', (users: ActiveUser[]) => {
      setActiveUsers(users);
    });
    
    socket.on('projectUsers', (users: ActiveUser[]) => {
      setProjectUsers(users);
    });

    return () => {
      if (currentDocIdRef.current) {
        socket.emit('leaveDocument', { documentId: currentDocIdRef.current, workspaceId });
      }
      socket.emit('leaveProject', { projectId });
      socket.disconnect();
    };
  }, [url, projectId, workspaceId]); // we omit documentId here so we don't reconnect on doc change

  // Handle document switching without full reconnect
  useEffect(() => {
    const socket = socketRef.current;
    if (socket && isConnected) {
      if (currentDocIdRef.current && currentDocIdRef.current !== documentId) {
        socket.emit('leaveDocument', { documentId: currentDocIdRef.current, workspaceId });
      }
      if (documentId && currentDocIdRef.current !== documentId) {
        socket.emit('joinDocument', { documentId, workspaceId });
      }
      currentDocIdRef.current = documentId;
    }
  }, [documentId, isConnected, workspaceId]);

  return {
    socket: socketRef.current,
    isConnected,
    activeUsers,
    projectUsers,
  };
}

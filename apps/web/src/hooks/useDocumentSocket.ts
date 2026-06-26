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
<<<<<<< HEAD
  documentId: string;
=======
  documentId: string | null;
  projectId?: string;
>>>>>>> feature/phase-4-yjs
}

interface UseDocumentSocketProps {
  projectId: string;
  documentId: string | null;
  url?: string;
}

export const defaultToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1Y2MwMDQyNC1lMTczLTRmOTYtODFlYy01MzY2YzY4YmYyZTgiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJpYXQiOjE3ODIzODE2NjcsImV4cCI6MTc4MjQ2ODA2N30.deVnwUVhYM0FzWW7gCmd6eJE_KDo-1iqpU9_14ocf1I';

export function useDocumentSocket({ projectId, documentId, url = 'http://localhost:3001' }: UseDocumentSocketProps) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
<<<<<<< HEAD

  useEffect(() => {
    // Check localStorage first, otherwise fallback to User 1's token for testing
    const defaultToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1Y2MwMDQyNC1lMTczLTRmOTYtODFlYy01MzY2YzY4YmYyZTgiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJpYXQiOjE3ODIzODE2NjcsImV4cCI6MTc4MjQ2ODA2N30.deVnwUVhYM0FzWW7gCmd6eJE_KDo-1iqpU9_14ocf1I';
=======
  const [projectUsers, setProjectUsers] = useState<ActiveUser[]>([]);
  
  const currentDocIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Check localStorage first, otherwise fallback to User 1's token for testing
>>>>>>> feature/phase-4-yjs
    const token = typeof window !== 'undefined' ? localStorage.getItem('test_jwt_token') || defaultToken : defaultToken;

    const socket = io(url, {
      auth: {
        token: token || '',
      },
    });
    
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
<<<<<<< HEAD
      console.log('Connected to document socket', socket.id);
      socket.emit('joinDocument', { documentId });
=======
      console.log('Connected to socket', socket.id);
      socket.emit('joinProject', { projectId });
      
      if (documentId) {
        socket.emit('joinDocument', { documentId });
        currentDocIdRef.current = documentId;
      }
>>>>>>> feature/phase-4-yjs
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from socket');
    });

    socket.on('activeUsers', (users: ActiveUser[]) => {
      setActiveUsers(users);
    });
<<<<<<< HEAD

    socketRef.current = socket;

    return () => {
      socket.emit('leaveDocument', { documentId });
      socket.disconnect();
    };
  }, [url, documentId]);
=======
    
    socket.on('projectUsers', (users: ActiveUser[]) => {
      setProjectUsers(users);
    });

    return () => {
      if (currentDocIdRef.current) {
        socket.emit('leaveDocument', { documentId: currentDocIdRef.current });
      }
      socket.emit('leaveProject', { projectId });
      socket.disconnect();
    };
  }, [url, projectId]);
>>>>>>> feature/phase-4-yjs

  // Handle document switching without full reconnect
  useEffect(() => {
    const socket = socketRef.current;
    if (socket && isConnected) {
      if (currentDocIdRef.current && currentDocIdRef.current !== documentId) {
        socket.emit('leaveDocument', { documentId: currentDocIdRef.current });
      }
      if (documentId && currentDocIdRef.current !== documentId) {
        socket.emit('joinDocument', { documentId });
      }
      currentDocIdRef.current = documentId;
    }
  }, [documentId, isConnected]);

  return {
    socket: socketRef.current,
    isConnected,
<<<<<<< HEAD
    saveDocument,
    activeUsers,
=======
    activeUsers,
    projectUsers,
>>>>>>> feature/phase-4-yjs
  };
}

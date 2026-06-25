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
  documentId: string;
}

interface UseDocumentSocketProps {
  documentId: string;
  url?: string;
}

export function useDocumentSocket({ documentId, url = 'http://localhost:3001' }: UseDocumentSocketProps) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);

  useEffect(() => {
    // Check localStorage first, otherwise fallback to User 1's token for testing
    const defaultToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1Y2MwMDQyNC1lMTczLTRmOTYtODFlYy01MzY2YzY4YmYyZTgiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJpYXQiOjE3ODIzODE2NjcsImV4cCI6MTc4MjQ2ODA2N30.deVnwUVhYM0FzWW7gCmd6eJE_KDo-1iqpU9_14ocf1I';
    const token = typeof window !== 'undefined' ? localStorage.getItem('test_jwt_token') || defaultToken : defaultToken;

    const socket = io(url, {
      auth: {
        token: token || '',
      },
    });

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to document socket', socket.id);
      socket.emit('joinDocument', { documentId });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from document socket');
    });

    socket.on('activeUsers', (users: ActiveUser[]) => {
      setActiveUsers(users);
    });

    socketRef.current = socket;

    return () => {
      socket.emit('leaveDocument', { documentId });
      socket.disconnect();
    };
  }, [url, documentId]);

  const saveDocument = (content: string) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('saveDocument', { documentId, content });
    } else {
      console.warn('Socket not connected, cannot save document');
    }
  };

  return {
    socket: socketRef.current,
    isConnected,
    saveDocument,
    activeUsers,
  };
}

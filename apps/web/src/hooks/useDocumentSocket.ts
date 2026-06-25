import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseDocumentSocketProps {
  documentId: string;
  url?: string;
}

export function useDocumentSocket({ documentId, url = 'http://localhost:3001' }: UseDocumentSocketProps) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Hardcoded for testing Phase 2
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ODQ5ZmZjMy00MDVjLTQ5MjctOWRhZi0wYmYxYzdmNGViMjkiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJpYXQiOjE3ODIzNzg3MDgsImV4cCI6MTc4MjQ2NTEwOH0.pCdjIdKqVUmp4zgP1ha0Wt-_RH3PKXL-YTNwfEtowPg';

    const socket = io(url, {
      auth: {
        token: token || '',
      },
    });

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to document socket', socket.id);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from document socket');
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [url]);

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
  };
}

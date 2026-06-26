'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import 'xterm/css/xterm.css';
import { io, Socket } from 'socket.io-client';

interface TerminalPanelProps {
  workspaceId: string;
  userId?: string;
}

export function TerminalPanel({ workspaceId, userId }: TerminalPanelProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [role, setRole] = useState<string>('VIEWER');

  useEffect(() => {
    if (!terminalRef.current) return;

    // Clear container to prevent duplicate terminals in React Strict Mode
    terminalRef.current.innerHTML = '';

    // Initialize xterm.js
    const term = new Terminal({
      cursorBlink: true,
      fontFamily: 'monospace',
      theme: {
        background: '#1e1e1e',
      }
    });
    
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon());

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;
    
    let isDisposed = false;

    // Use ResizeObserver for accurate sizing
    const resizeObserver = new ResizeObserver(() => {
      if (isDisposed || !terminalRef.current) return;
      if (terminalRef.current.clientWidth > 0 && terminalRef.current.clientHeight > 0) {
        try {
          fitAddon.fit();
        } catch (e) {
          console.warn('ResizeObserver fit error:', e);
        }
      }
    });

    // Defer opening until the DOM has definitely painted
    requestAnimationFrame(() => {
      if (isDisposed || !terminalRef.current) return;
      
      try {
        term.open(terminalRef.current);
        resizeObserver.observe(terminalRef.current);
        
        if (terminalRef.current.clientWidth > 0 && terminalRef.current.clientHeight > 0) {
          fitAddon.fit();
        }
      } catch (e) {
        console.warn('Terminal open error:', e);
      }
    });

    // Initialize Socket.IO
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const socket = io(`${apiUrl}/terminal`, {
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      socket.emit('join', { workspaceId, userId });
    });

    socket.on('joined', (data: { role: string }) => {
      if (isDisposed) return;
      setRole(data.role);
      try {
        term.writeln(`\r\n\x1b[32mConnected to terminal as ${data.role}\x1b[0m\r\n`);
      } catch (e) {}
    });

    socket.on('output', (data: string) => {
      if (!isDisposed) {
        try {
          term.write(data);
        } catch (e) {}
      }
    });

    // Write data to socket when user types
    term.onData((data) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('input', data);
      }
    });

    socketRef.current = socket;

    return () => {
      isDisposed = true;
      resizeObserver.disconnect();
      socket.disconnect();
      term.dispose();
      if (terminalRef.current) {
        terminalRef.current.innerHTML = '';
      }
    };
  }, [workspaceId, userId]);

  return (
    <div className="flex flex-col h-full w-full bg-[#1e1e1e] border-t border-gray-700 font-sans">
      <div className="flex justify-between items-center px-4 py-1 bg-[#2d2d2d] text-gray-300 text-xs">
        <div className="font-semibold uppercase tracking-wider">Terminal</div>
        <div className="flex items-center gap-2">
          {role === 'VIEWER' ? (
            <span className="text-yellow-500 font-medium">Read-Only</span>
          ) : (
            <span className="text-green-500 font-medium">Interactive</span>
          )}
        </div>
      </div>
      <div ref={terminalRef} className="flex-1 w-full overflow-hidden p-2" />
    </div>
  );
}

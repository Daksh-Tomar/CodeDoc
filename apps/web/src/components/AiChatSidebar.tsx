"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Send, X, Bot, User, Code2, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface AiChatSidebarProps {
  documentId: string;
  token: string | null;
  onClose: () => void;
  getEditorContext: () => any;
}

export function AiChatSidebar({ documentId, token, onClose, getEditorContext }: AiChatSidebarProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch history on mount
  useEffect(() => {
    if (!token || !documentId) return;

    fetch('http://localhost:3001/ai/history', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ documentId })
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setMessages(data.map(m => ({ id: m.id, role: m.role, content: m.content })));
        }
      })
      .catch(console.error);
  }, [token, documentId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !token) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    const context = getEditorContext();

    try {
      const response = await fetch('http://localhost:3001/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          documentId,
          prompt: userMessage.content,
          context
        })
      });

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      let assistantMessageContent = '';
      const assistantMessageId = (Date.now() + 1).toString();

      setMessages(prev => [...prev, { id: assistantMessageId, role: 'assistant', content: '' }]);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.replace('data: ', '').trim();
            if (!dataStr) continue;
            try {
              const data = JSON.parse(dataStr);
              if (data.text === '[DONE]') {
                break;
              }
              assistantMessageContent += data.text;
              
              setMessages(prev => 
                prev.map(msg => 
                  msg.id === assistantMessageId 
                    ? { ...msg, content: assistantMessageContent }
                    : msg
                )
              );
            } catch (err) {
              console.error('Error parsing SSE chunk', err);
            }
          }
        }
      }
    } catch (err) {
      console.error('Chat error', err);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="w-96 flex flex-col h-full bg-zinc-900 border-l border-zinc-800 absolute right-0 top-0 z-50">
      <div className="h-12 border-b border-zinc-800 flex items-center justify-between px-4 shrink-0 bg-zinc-950">
        <div className="flex items-center gap-2 text-white">
          <Bot size={18} className="text-blue-400" />
          <span className="font-semibold text-sm">AI Pair Programmer</span>
        </div>
        <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-4">
            <Bot size={48} className="text-zinc-700" />
            <p className="text-sm text-center px-4">
              I'm your private AI assistant. I can see your cursor and highlighted code. Ask me anything!
            </p>
          </div>
        )}
        
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-blue-600' : 'bg-emerald-600'}`}>
              {msg.role === 'user' ? <User size={16} className="text-white" /> : <Bot size={16} className="text-white" />}
            </div>
            
            <div className={`flex-1 text-sm ${msg.role === 'user' ? 'text-right' : ''}`}>
              <div className="font-medium text-zinc-400 mb-1 text-xs">
                {msg.role === 'user' ? 'You' : 'Assistant'}
              </div>
              <div className={`inline-block p-3 rounded-lg text-left ${msg.role === 'user' ? 'bg-blue-600/20 text-white' : 'bg-zinc-800 text-zinc-200 w-full'}`}>
                <ReactMarkdown
                  components={{
                    code({node, inline, className, children, ...props}: any) {
                      const match = /language-(\w+)/.exec(className || '')
                      return !inline && match ? (
                        <SyntaxHighlighter
                          {...props}
                          children={String(children).replace(/\n$/, '')}
                          style={vscDarkPlus as any}
                          language={match[1]}
                          PreTag="div"
                          className="rounded-md my-2"
                        />
                      ) : (
                        <code {...props} className="bg-zinc-950 px-1 py-0.5 rounded text-pink-400">
                          {children}
                        </code>
                      )
                    }
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="flex gap-3">
             <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center shrink-0">
                <Bot size={16} className="text-white" />
            </div>
            <div className="bg-zinc-800 rounded-lg p-3 flex items-center gap-2">
              <Loader2 size={14} className="text-zinc-400 animate-spin" />
              <span className="text-zinc-400 text-xs">Thinking...</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-zinc-800 bg-zinc-950">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your code..."
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
          />
          <button 
            type="submit"
            disabled={!input.trim() || isTyping}
            className="bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}

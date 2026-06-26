import React, { useState, useEffect } from 'react';

type Notification = {
  id: string;
  type: string;
  content: string;
  read: boolean;
};

export function Notifications() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    // In a real app, this would connect to the NotificationGateway WebSocket
    setNotifications([
      { id: '1', type: 'REVIEW_REQUEST', content: 'Aryan requested your review on auth.ts', read: false },
      { id: '2', type: 'MENTION', content: 'Rahul mentioned you in a comment', read: true }
    ]);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-400 hover:text-white transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-[#252526] border border-[#333] rounded shadow-xl z-50">
          <div className="p-3 border-b border-[#333] flex justify-between items-center">
            <h3 className="text-white font-semibold text-sm">Notifications</h3>
            <button className="text-xs text-blue-400 hover:text-blue-300">Mark all read</button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.map(n => (
              <div 
                key={n.id} 
                className={`p-3 border-b border-[#333] ${!n.read ? 'bg-[#2a2d3e]' : ''}`}
              >
                <div className="text-xs text-gray-400 mb-1">{n.type.replace('_', ' ')}</div>
                <div className="text-sm text-gray-200">{n.content}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

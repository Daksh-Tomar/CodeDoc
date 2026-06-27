import React, { useEffect, useState } from 'react';

import { Socket } from 'socket.io-client';

type Activity = {
  id: string;
  type: string;
  description: string;
  aiSummary: string | null;
  createdAt: string;
  user: { displayName: string; email: string };
  fileNode?: { name: string };
};

export function ActivityFeed({ projectId, socket }: { projectId: string, socket: Socket | null }) {
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    // Fetch initial activities
    fetch(`http://localhost:3001/projects/${projectId}/activities`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setActivities(data);
        }
      })
      .catch(err => console.error("Failed to fetch activities:", err));
  }, [projectId]);

  useEffect(() => {
    if (!socket) return;
    
    const handleNewActivity = (activity: Activity) => {
      setActivities(prev => [activity, ...prev]);
    };

    socket.on('newActivity', handleNewActivity);

    return () => {
      socket.off('newActivity', handleNewActivity);
    };
  }, [socket]);

  return (
    <div className="w-80 h-full bg-[#1e1e1e] border-l border-[#333] flex flex-col">
      <div className="p-4 border-b border-[#333]">
        <h2 className="text-white text-sm font-semibold uppercase tracking-wider">Workspace Activity</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activities.map((act) => (
          <div key={act.id} className="text-sm">
            <div className="flex items-center space-x-2 text-gray-300">
              <span className="font-medium text-blue-400">{act.user.displayName || act.user.email}</span>
              <span className="text-gray-500 text-xs">
                {new Date(act.createdAt).toLocaleTimeString()}
              </span>
            </div>
            <div className="text-gray-200 mt-1">
              {act.type === 'FILE_MODIFIED' ? 'Modified ' : 'Acted on '}
              <span className="font-mono bg-[#2d2d2d] px-1 rounded text-green-400">
                {act.fileNode?.name || 'Workspace'}
              </span>
            </div>
            {act.aiSummary && (
              <div className="mt-2 p-2 bg-[#252526] rounded border-l-2 border-purple-500 text-gray-400 italic text-xs">
                ✨ AI Summary: {act.aiSummary}
              </div>
            )}
          </div>
        ))}
        {activities.length === 0 && (
          <div className="text-gray-500 text-center mt-10 text-xs">No recent activity</div>
        )}
      </div>
    </div>
  );
}

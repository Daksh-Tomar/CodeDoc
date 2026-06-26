import React, { useEffect, useState } from 'react';

type Activity = {
  id: string;
  type: string;
  description: string;
  aiSummary: string | null;
  createdAt: string;
  user: { name: string; email: string };
  fileNode?: { name: string };
};

export function ActivityFeed({ workspaceId }: { workspaceId: string }) {
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    // In a real implementation, this would fetch from the backend ActivityService API
    // e.g. fetch(`/api/workspaces/${workspaceId}/activities`)
    // Mocking for now to demonstrate UI
    setActivities([
      {
        id: '1',
        type: 'FILE_MODIFIED',
        description: 'Updated authentication logic',
        aiSummary: 'Implemented robust error handling for login edge cases.',
        createdAt: new Date().toISOString(),
        user: { name: 'Daksh', email: 'daksh@example.com' },
        fileNode: { name: 'auth.ts' }
      }
    ]);
  }, [workspaceId]);

  return (
    <div className="w-80 h-full bg-[#1e1e1e] border-l border-[#333] flex flex-col">
      <div className="p-4 border-b border-[#333]">
        <h2 className="text-white text-sm font-semibold uppercase tracking-wider">Workspace Activity</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activities.map((act) => (
          <div key={act.id} className="text-sm">
            <div className="flex items-center space-x-2 text-gray-300">
              <span className="font-medium text-blue-400">{act.user.name}</span>
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

import React from 'react';

type Stats = {
  activeUsers: number;
  totalFiles: number;
  totalActivities: number;
  aiUsageCount: number;
  totalProjects: number;
};

export function AnalyticsDashboard({ stats, onClose }: { stats?: Stats, onClose: () => void }) {
  const displayStats = stats || {
    activeUsers: 3,
    totalFiles: 142,
    totalActivities: 856,
    aiUsageCount: 234,
    totalProjects: 2
  };

  return (
    <div className="absolute top-10 right-10 w-[600px] bg-[#1e1e1e] border border-[#333] shadow-2xl rounded-lg z-40 flex flex-col">
      <div className="p-4 border-b border-[#333] flex justify-between items-center bg-[#252526] rounded-t-lg">
        <h2 className="text-white font-semibold text-lg flex items-center">
          <svg className="w-5 h-5 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Workspace Intelligence
        </h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div className="p-6 grid grid-cols-2 gap-4">
        <div className="bg-[#2d2d2d] p-4 rounded border border-[#3c3c3c]">
          <div className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-1">Active Collaborators</div>
          <div className="text-3xl font-bold text-white">{displayStats.activeUsers}</div>
        </div>
        
        <div className="bg-[#2d2d2d] p-4 rounded border border-[#3c3c3c]">
          <div className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-1">Files Tracked</div>
          <div className="text-3xl font-bold text-white">{displayStats.totalFiles}</div>
        </div>
        
        <div className="bg-[#2d2d2d] p-4 rounded border border-[#3c3c3c]">
          <div className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-1">Total Activities</div>
          <div className="text-3xl font-bold text-green-400">{displayStats.totalActivities}</div>
        </div>

        <div className="bg-[#2d2d2d] p-4 rounded border border-[#3c3c3c]">
          <div className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-1">AI Summaries Generated</div>
          <div className="text-3xl font-bold text-purple-400">{displayStats.aiUsageCount}</div>
        </div>
      </div>
      
      <div className="p-4 bg-[#252526] rounded-b-lg border-t border-[#333] text-xs text-gray-500 text-center">
        Data updates in real-time as your team collaborates.
      </div>
    </div>
  );
}

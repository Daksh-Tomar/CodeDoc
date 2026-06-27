'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface SettingsModalProps {
  workspaceId: string;
  workspaceName: string;
  token: string;
  onClose: () => void;
}

export function SettingsModal({ workspaceId, workspaceName, token, onClose }: SettingsModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm('Are you absolutely sure? This action cannot be undone.')) return;
    setIsDeleting(true);
    
    try {
      const res = await fetch(`http://localhost:3001/workspaces/${workspaceId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        router.push('/dashboard');
      } else {
        alert('Failed to delete workspace');
        setIsDeleting(false);
      }
    } catch (error) {
      console.error(error);
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-zinc-900 p-6 text-zinc-100 shadow-xl border border-zinc-800">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Workspace Settings</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">✕</button>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium text-zinc-400 mb-2">Workspace Name</h3>
            <div className="bg-zinc-800 px-3 py-2 rounded text-zinc-300">
              {workspaceName}
            </div>
            <p className="text-xs text-zinc-500 mt-1">Renaming is not supported in this version.</p>
          </div>

          <div className="pt-6 border-t border-red-900/30">
            <h3 className="text-sm font-medium text-red-500 mb-2">Danger Zone</h3>
            <div className="bg-red-950/20 border border-red-900/50 rounded p-4">
              <h4 className="font-medium text-white mb-1">Delete this workspace</h4>
              <p className="text-xs text-zinc-400 mb-4">
                Once deleted, it will be gone forever. Please be certain.
              </p>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete Workspace'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

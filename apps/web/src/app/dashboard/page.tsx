'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function DashboardPage() {
  const { user, token, logout, isLoading } = useAuth();
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (token) {
      fetchWorkspaces();
    }
  }, [token]);

  const fetchWorkspaces = async () => {
    try {
      const res = await fetch('http://localhost:3001/workspaces', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setWorkspaces(data);
      }
    } catch (error) {
      console.error('Failed to fetch workspaces', error);
    }
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;
    
    setIsCreating(true);
    try {
      const res = await fetch('http://localhost:3001/workspaces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: newWorkspaceName })
      });
      
      if (res.ok) {
        const workspace = await res.json();
        router.push(`/workspaces/${workspace.id}`);
      } else {
        alert('Failed to create workspace');
        setIsCreating(false);
      }
    } catch (error) {
      console.error('Error creating workspace', error);
      setIsCreating(false);
    }
  };

  if (isLoading || !user) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">CodeDoc Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-700">Welcome, {user.displayName}</span>
            <button onClick={logout} className="text-sm text-red-600 hover:text-red-800">Logout</button>
          </div>
        </div>
      </header>
      <main>
        <div className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
          
          <div className="mb-8 p-6 bg-white shadow rounded-lg">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">Create a New Workspace</h2>
            <form onSubmit={handleCreateWorkspace} className="flex gap-4">
              <input
                type="text"
                placeholder="Workspace Name"
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                disabled={isCreating}
              />
              <button
                type="submit"
                disabled={isCreating}
                className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-indigo-300"
              >
                {isCreating ? 'Creating...' : 'Create Workspace'}
              </button>
            </form>
          </div>

          <h2 className="text-2xl font-bold mb-4 text-gray-900">My Workspaces</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {workspaces.map((ws) => (
              <div key={ws.id} className="overflow-hidden rounded-lg bg-white shadow">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="w-0 flex-1">
                      <dl>
                        <dt className="truncate text-sm font-medium text-gray-500">{ws.ownerId === user.id ? 'Owner' : 'Shared'}</dt>
                        <dd className="text-lg font-medium text-gray-900">{ws.name}</dd>
                        <dd className="text-xs text-gray-500 mt-1">{ws._count?.members || 1} Members</dd>
                      </dl>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-5 py-3 flex justify-end">
                  <Link href={`/workspaces/${ws.id}`} className="text-sm font-medium text-indigo-700 hover:text-indigo-900">
                    Open Workspace &rarr;
                  </Link>
                </div>
              </div>
            ))}
            {workspaces.length === 0 && (
              <div className="col-span-full text-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
                <p className="text-gray-500">You don't have any workspaces yet.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

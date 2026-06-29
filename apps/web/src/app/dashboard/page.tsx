'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Plasma from '@/components/Plasma';
import { 
  Folder, Sparkles, Terminal, Users, Activity, Bot, 
  Search, Bell, HelpCircle, LogOut, LayoutDashboard, 
  Star, Trash2, Box, Command, ChevronRight, 
  MoreHorizontal, Plus, GitPullRequest, Code, FileCode2
} from 'lucide-react';

export default function DashboardPage() {
  const { user, token, logout, isLoading } = useAuth();
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
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
    return (
      <div className="flex h-screen items-center justify-center bg-[#09090B]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-[#09090B] text-gray-100 overflow-hidden selection:bg-indigo-500/30 font-sans">
      <div className="fixed inset-0 z-0 pointer-events-none opacity-40">
        <Plasma color="#6366f1" speed={0.4} direction="forward" scale={1.5} opacity={0.6} mouseInteractive={false} />
      </div>

      {/* LEFT SIDEBAR */}
      <aside className="relative z-10 w-64 h-full border-r border-white/10 bg-[#09090B]/60 backdrop-blur-xl flex flex-col shrink-0">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-[0_0_15px_rgba(79,70,229,0.5)]">
            <Code className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">CodeDoc</span>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto pb-6">
          <p className="px-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3 mt-4">Menu</p>
          <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg bg-indigo-500/10 text-indigo-400 font-medium">
            <LayoutDashboard className="w-4 h-4" /> Dashboard
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:bg-white/5 hover:text-gray-200 transition-colors">
            <Folder className="w-4 h-4" /> Workspaces
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:bg-white/5 hover:text-gray-200 transition-colors">
            <Activity className="w-4 h-4" /> Activity
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:bg-white/5 hover:text-gray-200 transition-colors">
            <Bot className="w-4 h-4" /> AI Chats
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:bg-white/5 hover:text-gray-200 transition-colors">
            <FileCode2 className="w-4 h-4" /> Templates
          </a>

          <p className="px-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3 mt-8">Collections</p>
          <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:bg-white/5 hover:text-gray-200 transition-colors">
            <Users className="w-4 h-4" /> Shared with me
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:bg-white/5 hover:text-gray-200 transition-colors">
            <Star className="w-4 h-4" /> Starred
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:bg-white/5 hover:text-gray-200 transition-colors">
            <Trash2 className="w-4 h-4" /> Trash
          </a>
        </nav>

        <div className="p-4 border-t border-white/10 space-y-4">
          <div className="bg-black/30 rounded-lg p-4 border border-white/5">
            <div className="flex justify-between items-end mb-2">
              <span className="text-xs font-medium text-gray-400">Storage Used</span>
              <span className="text-[10px] font-medium text-gray-300">5.2 GB <span className="text-gray-600">/ 20 GB</span></span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-1.5 mb-4">
              <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: '25%' }}></div>
            </div>
            
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-400">Containers</span>
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                2 Running
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-md shrink-0">
              {user.displayName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-200 truncate">{user.displayName}</p>
              <p className="text-[10px] text-gray-500 truncate">{user.email}</p>
            </div>
            <button className="text-gray-500 hover:text-gray-300 shrink-0">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN AREA */}
      <div className="flex-1 flex flex-col h-full relative z-10 min-w-0">
        
        {/* TOP NAVBAR */}
        <header className="h-16 border-b border-white/10 bg-[#09090B]/40 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-40 shrink-0">
          <div className="flex-1 flex items-center max-w-xl">
            <div className="relative w-full group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400 group-focus-within:text-indigo-400 transition-colors" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-12 py-1.5 border border-white/10 rounded-lg leading-5 bg-black/40 text-gray-300 placeholder-gray-500 focus:outline-none focus:bg-black/60 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all"
                placeholder="Search workspaces..."
              />
              <div className="absolute inset-y-0 right-0 pr-2 flex items-center">
                <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded px-1.5 py-0.5">
                  <Command className="w-3 h-3 text-gray-400" />
                  <span className="text-xs text-gray-400 font-medium">K</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-5 pl-4 shrink-0">
            <button className="text-gray-400 hover:text-gray-200 transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-indigo-500 ring-2 ring-[#09090B]"></span>
            </button>
            <button className="text-gray-400 hover:text-gray-200 transition-colors">
              <HelpCircle className="w-5 h-5" />
            </button>
            <button onClick={logout} className="text-gray-400 hover:text-red-400 transition-colors ml-2" title="Logout">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* SCROLLABLE CONTENT */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-10">
          <div className="max-w-7xl mx-auto space-y-10">
            
            {/* HERO */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2 border-b border-white/5">
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-2 flex items-center gap-3">
                  Good evening, <span className="text-indigo-400">{user.displayName.split(' ')[0]}</span>
                  <span className="inline-block hover:animate-spin origin-bottom-right transition-transform cursor-default">👋</span>
                </h1>
                <p className="text-gray-400 text-lg">Let's build something amazing today.</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button 
                  onClick={() => setIsCreateModalOpen(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 focus:ring-offset-[#09090B] transition-all shadow-[0_0_15px_rgba(79,70,229,0.4)] hover:shadow-[0_0_25px_rgba(79,70,229,0.6)]"
                >
                  <Plus className="w-4 h-4" /> New Workspace
                </button>
                <button className="hidden sm:inline-flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-4 py-2.5 text-sm font-medium text-gray-200 hover:bg-white/10 transition-colors">
                  <GitPullRequest className="w-4 h-4" /> Import from Git
                </button>
              </div>
            </div>

            {/* STATS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Workspaces', value: '12', trend: '↑ 20%', icon: Code, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                { label: 'Total Members', value: '18', trend: '↑ 12%', icon: Users, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                { label: 'Running Containers', value: '3', statDesc: '2 active now', icon: Box, color: 'text-orange-400', bg: 'bg-orange-500/10' },
                { label: 'AI Sessions', value: '42', trend: '↑ 34%', icon: Sparkles, color: 'text-purple-400', bg: 'bg-purple-500/10' }
              ].map((stat, i) => (
                <div key={i} className="bg-black/40 backdrop-blur-md border border-white/5 rounded-xl p-5 hover:bg-black/60 transition-colors shadow-lg group">
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`p-2.5 rounded-lg ${stat.bg} group-hover:scale-110 transition-transform`}>
                      <stat.icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                    <p className="text-sm font-medium text-gray-400">{stat.label}</p>
                  </div>
                  <div className="flex items-end justify-between">
                    <h3 className="text-3xl font-bold text-white">{stat.value}</h3>
                    {stat.trend ? (
                      <p className="text-xs font-medium text-emerald-400 flex items-center gap-1 mb-1">
                        {stat.trend} <span className="text-gray-600 font-normal">from last month</span>
                      </p>
                    ) : (
                      <p className="text-xs font-medium text-emerald-400 flex items-center gap-1 mb-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> {stat.statDesc}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* MAIN GRID */}
            <div className="flex flex-col xl:flex-row gap-8">
              
              {/* RECENT WORKSPACES */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white">Recent Workspaces</h2>
                  <button className="text-sm font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors">
                    View all <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {workspaces.map((ws) => (
                    <div key={ws.id} className="group flex flex-col bg-black/40 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden hover:border-indigo-500/50 hover:bg-black/60 transition-all hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                      <div className="p-5 flex-1 flex flex-col">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                              <Folder className="w-5 h-5 text-indigo-400" />
                            </div>
                            <div className="min-w-0">
                              <h3 className="text-lg font-semibold text-gray-100 group-hover:text-white flex items-center gap-2 truncate">
                                {ws.name}
                                {ws.ownerId === user.id && <Star className="w-3.5 h-3.5 text-indigo-400 fill-indigo-400/20 shrink-0" />}
                              </h3>
                              <p className="text-xs text-gray-500 mt-0.5 truncate">Updated just now</p>
                            </div>
                          </div>
                          <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-wide border border-emerald-500/20 shrink-0 ml-2">
                            Running
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-4 mt-auto pt-4 border-t border-white/5">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-gray-400">
                            <Users className="w-4 h-4" /> {ws._count?.members || 1} members
                          </div>
                          <div className="flex items-center gap-1.5 text-xs font-medium text-gray-400">
                            <Terminal className="w-4 h-4 text-yellow-500" /> Node.js
                          </div>
                        </div>
                      </div>
                      <div className="px-5 py-3 bg-white/[0.02] border-t border-white/5 flex items-center justify-between">
                        <Link href={`/workspaces/${ws.id}`} className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
                          Open Workspace
                        </Link>
                        <button className="text-gray-500 hover:text-gray-300 p-1.5 rounded-md hover:bg-white/10 transition-colors">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {workspaces.length === 0 && (
                    <div className="col-span-full py-16 flex flex-col items-center justify-center bg-black/20 border border-dashed border-white/10 rounded-xl">
                      <Folder className="w-12 h-12 text-gray-600 mb-4" />
                      <h3 className="text-lg font-medium text-gray-300 mb-1">No Workspaces Yet</h3>
                      <p className="text-sm text-gray-500 mb-6">Create your first collaborative workspace.</p>
                      <button 
                        onClick={() => setIsCreateModalOpen(true)}
                        className="rounded-lg bg-white/10 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/20 transition-colors"
                      >
                        Create Workspace
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT SIDEBAR - ACTIVITY */}
              <div className="xl:w-80 shrink-0">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white">Recent Activity</h2>
                  <button className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
                    View all
                  </button>
                </div>
                
                <div className="bg-black/40 backdrop-blur-md border border-white/5 rounded-xl p-5 space-y-6">
                  {[
                    { user: 'Daksh Tomar', action: 'edited main.ts', time: 'Just now', icon: null, color: 'bg-indigo-500' },
                    { user: 'AI Summary', action: 'Generated summary for Compiler', time: '5m ago', icon: Sparkles, color: 'bg-purple-500' },
                    { user: 'John Doe', action: 'joined CodeDoc', time: '15m ago', icon: null, color: 'bg-emerald-500' },
                    { user: 'Container', action: 'Environment started in CodeDoc', time: '20m ago', icon: Box, color: 'bg-gray-600' },
                  ].map((activity, i) => (
                    <div key={i} className="flex gap-4 group">
                      <div className="relative mt-1 shrink-0">
                        {activity.icon ? (
                          <div className={`w-8 h-8 rounded-full ${activity.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                            <activity.icon className="w-4 h-4 text-white" />
                          </div>
                        ) : (
                          <div className={`w-8 h-8 rounded-full ${activity.color} flex items-center justify-center text-white text-xs font-bold shadow-lg group-hover:scale-110 transition-transform`}>
                            {activity.user.charAt(0)}
                          </div>
                        )}
                        {i !== 3 && <div className="absolute top-8 bottom-[-24px] left-1/2 w-px bg-white/10"></div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <p className="text-sm font-medium text-gray-200 truncate pr-2">{activity.user}</p>
                          <span className="text-[10px] text-gray-500 flex items-center gap-1 shrink-0">
                            {activity.time} <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 block ml-1"></span>
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 line-clamp-2">{activity.action}</p>
                      </div>
                    </div>
                  ))}
                  
                  <button className="w-full py-2.5 mt-2 rounded-lg bg-white/5 text-sm font-medium text-gray-300 hover:bg-white/10 hover:text-white transition-colors border border-white/5">
                    View all activity
                  </button>
                </div>
              </div>
            </div>
            
            {/* FOOTER */}
            <footer className="pt-8 pb-4 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 border-t border-white/5 mt-12">
              <p className="flex items-center gap-1">
                <span className="text-red-500">♥</span> Made with passion by CodeDoc Team
              </p>
              <div className="flex items-center gap-6 mt-4 sm:mt-0">
                <a href="#" className="hover:text-gray-300 transition-colors">Docs</a>
                <a href="#" className="hover:text-gray-300 transition-colors">Support</a>
                <a href="#" className="hover:text-gray-300 transition-colors">Feedback</a>
              </div>
            </footer>
          </div>
        </main>
      </div>

      {/* CREATE WORKSPACE MODAL OVERLAY */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#09090B] border border-white/10 rounded-2xl w-full max-w-md shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden">
            <div className="p-6">
              <h3 className="text-xl font-bold text-white mb-2">Create Workspace</h3>
              <p className="text-sm text-gray-400 mb-6">Set up a new collaborative environment instantly.</p>
              
              <form onSubmit={handleCreateWorkspace} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Workspace Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. NextJS Dashboard"
                    className="block w-full rounded-lg border border-white/10 bg-black/40 px-4 py-2.5 text-white placeholder-gray-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm transition-all"
                    value={newWorkspaceName}
                    onChange={(e) => setNewWorkspaceName(e.target.value)}
                    disabled={isCreating}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Template <span className="text-xs text-indigo-400 font-normal ml-1">(Coming Soon)</span></label>
                  <select disabled className="block w-full rounded-lg border border-white/10 bg-black/40 px-4 py-2.5 text-gray-500 sm:text-sm opacity-50 cursor-not-allowed">
                    <option>Blank Canvas (Node.js)</option>
                    <option>React App</option>
                    <option>Next.js Fullstack</option>
                  </select>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    disabled={isCreating}
                    className="flex-1 rounded-lg border border-white/10 bg-transparent px-4 py-2.5 text-sm font-medium text-gray-300 hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 transition-colors shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:shadow-[0_0_20px_rgba(79,70,229,0.5)] disabled:opacity-50"
                  >
                    {isCreating ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

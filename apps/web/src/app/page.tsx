import { Editor } from "@/components/Editor";

export default function Home() {
  return (
    <div className="flex h-screen w-full bg-zinc-950 text-zinc-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-800 bg-zinc-900 flex flex-col">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <h1 className="font-bold text-lg tracking-tight">CodeDoc</h1>
        </div>
        <div className="flex-1 p-2 overflow-y-auto">
          <div className="text-sm font-medium text-zinc-400 mb-2 px-2 uppercase tracking-wider">Explorer</div>
          {/* File Tree Placeholder */}
          <div className="space-y-1">
            <div className="px-2 py-1 hover:bg-zinc-800 rounded cursor-pointer text-sm flex items-center gap-2 text-blue-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
              main.ts
            </div>
          </div>
        </div>
      </aside>

      {/* Main Editor Area */}
      <main className="flex-1 flex flex-col min-w-0">
        <div className="h-10 border-b border-zinc-800 bg-zinc-900 flex items-center px-4 gap-2">
          {/* Tabs Placeholder */}
          <div className="px-4 py-1.5 bg-zinc-800 text-sm rounded-t-md border-t border-blue-500 text-zinc-200">
            main.ts
          </div>
        </div>
        <div className="flex-1 p-4 bg-zinc-950">
          <Editor initialContent="// Welcome to CodeDoc Workspace" language="typescript" />
        </div>
      </main>
    </div>
  );
}

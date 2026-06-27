'use client';

import { useState, useEffect } from 'react';

interface Member {
  userId: string;
  role: string;
  user: {
    displayName: string;
    email: string;
  }
}

interface MembersModalProps {
  workspaceId: string;
  token: string;
  currentUserRole?: string;
  onClose: () => void;
}

export function MembersModal({ workspaceId, token, currentUserRole, onClose }: MembersModalProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [requests, setRequests] = useState<any[]>([]);

  useEffect(() => {
    fetchMembers();
    if (currentUserRole === 'OWNER' || currentUserRole === 'ADMIN') {
      fetchRequests();
    }
  }, [workspaceId, token, currentUserRole]);

  const fetchMembers = async () => {
    try {
      const res = await fetch(`http://localhost:3001/workspaces/${workspaceId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setMembers(data.members || []);
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const fetchRequests = async () => {
    try {
      const res = await fetch(`http://localhost:3001/workspaces/${workspaceId}/role-requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setRequests(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    try {
      await fetch(`http://localhost:3001/workspaces/${workspaceId}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ email: inviteEmail })
      });
      setInviteEmail('');
      fetchMembers();
    } catch (e) {
      console.error(e);
    }
  };

  const handleRequestAccess = async () => {
    try {
      await fetch(`http://localhost:3001/workspaces/${workspaceId}/request-access`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ requestedRole: 'EDITOR' })
      });
      alert('Request sent to owner.');
    } catch (e) {
      console.error(e);
    }
  };

  const handleApproveRequest = async (requestId: string, approve: boolean) => {
    try {
      await fetch(`http://localhost:3001/workspaces/${workspaceId}/approve-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ requestId, approve })
      });
      fetchRequests();
      fetchMembers();
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateRole = async (memberId: string, role: string) => {
    try {
      await fetch(`http://localhost:3001/workspaces/${workspaceId}/member-role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ memberId, role })
      });
      fetchMembers();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg bg-zinc-900 p-6 text-zinc-100 shadow-xl border border-zinc-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Workspace Members</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">✕</button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-zinc-500">Loading...</div>
        ) : (
          <div className="space-y-6">
            <div className="max-h-60 overflow-y-auto space-y-2">
              {members.map(member => (
                <div key={member.userId} className="flex items-center justify-between p-2 hover:bg-zinc-800 rounded">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center font-bold">
                      {member.user.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium">{member.user.displayName}</div>
                      <div className="text-xs text-zinc-400">{member.user.email}</div>
                    </div>
                  </div>
                  
                  {(currentUserRole === 'OWNER' || currentUserRole === 'ADMIN') && member.role !== 'OWNER' ? (
                    <select
                      className="bg-zinc-800 text-sm rounded border border-zinc-700 px-2 py-1"
                      value={member.role}
                      onChange={(e) => handleUpdateRole(member.userId, e.target.value)}
                    >
                      <option value="ADMIN">Admin</option>
                      <option value="EDITOR">Editor</option>
                      <option value="VIEWER">Viewer</option>
                    </select>
                  ) : (
                    <span className="text-xs px-2 py-1 bg-zinc-800 rounded text-zinc-300">{member.role}</span>
                  )}
                </div>
              ))}
            </div>

            {(currentUserRole === 'OWNER' || currentUserRole === 'ADMIN') && (
              <div className="border-t border-zinc-800 pt-4">
                <h3 className="text-sm font-medium mb-2 text-zinc-400">Invite Member</h3>
                <form onSubmit={handleInvite} className="flex gap-2">
                  <input
                    type="email"
                    placeholder="Email address"
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm outline-none focus:border-indigo-500"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                  <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded text-sm font-medium transition-colors">
                    Invite
                  </button>
                </form>
              </div>
            )}

            {currentUserRole === 'VIEWER' && (
              <div className="border-t border-zinc-800 pt-4 text-center">
                <button 
                  onClick={handleRequestAccess}
                  className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded text-sm font-medium transition-colors"
                >
                  Request Editor Access
                </button>
              </div>
            )}

            {(currentUserRole === 'OWNER' || currentUserRole === 'ADMIN') && requests.length > 0 && (
              <div className="border-t border-zinc-800 pt-4">
                <h3 className="text-sm font-medium mb-2 text-orange-400">Pending Requests</h3>
                <div className="space-y-2">
                  {requests.map(req => (
                    <div key={req.id} className="flex items-center justify-between p-2 bg-zinc-800/50 rounded border border-zinc-700">
                      <div className="text-sm">
                        <span className="font-medium text-white">{req.requester.displayName}</span> requests <span className="text-indigo-400 font-medium">{req.requestedRole}</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleApproveRequest(req.id, true)} className="text-xs bg-emerald-600 hover:bg-emerald-700 px-2 py-1 rounded">Approve</button>
                        <button onClick={() => handleApproveRequest(req.id, false)} className="text-xs bg-red-600 hover:bg-red-700 px-2 py-1 rounded">Reject</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

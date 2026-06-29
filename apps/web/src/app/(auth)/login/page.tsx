'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import Lightfall from '@/components/Lightfall';
import GlassSurface from '@/components/GlassSurface';

const lightfallColors = ['#A6C8FF', '#5227FF', '#FF9FFC'];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isResetMode, setIsResetMode] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (isResetMode) {
      if (newPassword !== confirmPassword) {
        setError('New passwords do not match');
        return;
      }
      try {
        const res = await fetch('http://localhost:3001/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, newPassword }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Reset failed');

        setSuccess('Password reset successfully. Please sign in with your new password.');
        setIsResetMode(false);
        setPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } catch (err: any) {
        setError(err.message);
      }
      return;
    }

    try {
      const res = await fetch('http://localhost:3001/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Login failed');

      login(data.access_token, data.user);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#0A29FF]">
      <div className="absolute inset-0 z-0 overflow-hidden">
        <Lightfall
          colors={lightfallColors}
          backgroundColor="#0A29FF"
          speed={1}
          streakCount={8}
          streakWidth={1}
          streakLength={1}
          glow={1}
          density={1}
          twinkle={1}
          zoom={2}
          backgroundGlow={1}
          opacity={1}
          mouseInteraction={true}
        />
      </div>
      <GlassSurface
        width="100%"
        height="auto"
        className="relative z-10 w-full max-w-md"
        borderRadius={24}
        blur={16}
        opacity={0.7}
        brightness={10}
        backgroundOpacity={0.6}
      >
        <div className="w-full flex flex-col space-y-8 p-4 sm:p-6">
          <div>
            <h2 className="mt-2 text-center text-3xl font-bold tracking-tight text-white drop-shadow-md">
              {isResetMode ? 'Reset your password' : 'Sign in to CodeDoc'}
            </h2>
          </div>
          <form className="mt-4 space-y-6" onSubmit={handleSubmit}>
            {error && <div className="text-red-300 text-sm text-center font-medium drop-shadow">{error}</div>}
            {success && <div className="text-emerald-300 text-sm text-center font-medium drop-shadow">{success}</div>}
            <div className="-space-y-px rounded-md shadow-sm">
              <div>
                <input
                  type="email"
                  required
                  className={`relative block w-full appearance-none rounded-none ${isResetMode ? 'rounded-md' : 'rounded-t-md'} border border-white/20 bg-white/10 px-3 py-3 text-white placeholder-white/70 focus:z-10 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 sm:text-sm backdrop-blur-sm transition-colors`}
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              {!isResetMode ? (
                <div>
                  <input
                    type="password"
                    required
                    className="relative block w-full appearance-none rounded-none rounded-b-md border border-white/20 border-t-0 bg-white/10 px-3 py-3 text-white placeholder-white/70 focus:z-10 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 sm:text-sm backdrop-blur-sm transition-colors"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              ) : (
                <>
                  <div>
                    <input
                      type="password"
                      required
                      className="relative block w-full appearance-none rounded-none border border-white/20 border-t-0 bg-white/10 px-3 py-3 text-white placeholder-white/70 focus:z-10 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 sm:text-sm backdrop-blur-sm transition-colors"
                      placeholder="New Password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                  <div>
                    <input
                      type="password"
                      required
                      className="relative block w-full appearance-none rounded-none rounded-b-md border border-white/20 border-t-0 bg-white/10 px-3 py-3 text-white placeholder-white/70 focus:z-10 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 sm:text-sm backdrop-blur-sm transition-colors"
                      placeholder="Confirm New Password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>

            {!isResetMode && (
              <div className="flex items-center justify-end">
                <div className="text-sm">
                  <button 
                    type="button"
                    onClick={() => { setIsResetMode(true); setError(''); setSuccess(''); }}
                    className="font-medium text-blue-200 hover:text-white transition-colors drop-shadow"
                  >
                    Forgot your password?
                  </button>
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                className="group relative flex w-full justify-center rounded-md border border-white/20 bg-white/20 py-2.5 px-4 text-sm font-medium text-white hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-[#0A29FF] transition-all backdrop-blur-md shadow-lg"
              >
                {isResetMode ? 'Reset Password' : 'Sign in'}
              </button>
            </div>
            
            {isResetMode && (
              <div className="text-center">
                <button 
                  type="button"
                  onClick={() => { setIsResetMode(false); setError(''); setSuccess(''); }}
                  className="text-sm font-medium text-white/80 hover:text-white transition-colors"
                >
                  Back to Sign in
                </button>
              </div>
            )}
          </form>
          {!isResetMode && (
            <div className="text-center">
              <Link href="/register" className="text-sm font-medium text-blue-200 hover:text-white transition-colors drop-shadow">
                Don't have an account? Sign up
              </Link>
            </div>
          )}
        </div>
      </GlassSurface>
    </div>
  );
}

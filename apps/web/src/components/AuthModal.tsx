'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { setAuthPreference, getUnsyncedItems, markItemsAsSynced } from '@/lib/historyStore';
import { syncHistoryToCloud } from '@/lib/api';
import { 
  Shield, Lock, User, Check, X, ArrowRight, Loader2, 
  Sparkles, Mail, KeyRound, Cloud, HelpCircle, CheckCircle2 
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialView?: 'prompt' | 'auth';
  onAuthSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialView = 'auth',
  onAuthSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'signin' | 'signup' | 'demo'>(
    initialView === 'prompt' ? 'demo' : 'signin'
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [syncStatus, setSyncStatus] = useState('');
  const [offerSignUp, setOfferSignUp] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialView === 'prompt' ? 'signin' : 'signin');
      setErrorMsg('');
      setSuccessMsg('');
      setSyncStatus('');
      setOfferSignUp(false);
    }
  }, [isOpen, initialView]);

  if (!isOpen) return null;

  const handleContinueAsGuest = () => {
    setAuthPreference('guest');
    onClose();
  };

  const syncPendingItems = async () => {
    const unsynced = getUnsyncedItems();
    if (unsynced.length > 0) {
      setSyncStatus(`Syncing ${unsynced.length} local queries to your cloud account...`);
      try {
        const syncRes = await syncHistoryToCloud(unsynced);
        markItemsAsSynced(syncRes.synced_ids);
      } catch (syncErr) {
        console.warn('Initial sync warning:', syncErr);
      }
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    setOfferSignUp(false);

    try {
      if (activeTab === 'signup') {
        // Sign Up
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
        });

        if (error) {
          throw error;
        }

        if (data.session) {
          // Direct login without confirmation requirement
          setAuthPreference('authenticated');
          await syncPendingItems();
          onAuthSuccess?.();
          onClose();
        } else if (data.user) {
          // Email confirmation is required by Supabase settings
          setSuccessMsg(
            `Account created for ${data.user.email}! Please check your email inbox to confirm your account, or use 1-Click Demo Login to continue right away.`
          );
        }
      } else {
        // Sign In
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });

        if (error) {
          if (
            error.message.toLowerCase().includes('invalid login credentials') ||
            error.message.toLowerCase().includes('user not found')
          ) {
            setOfferSignUp(true);
            throw new Error('No account found with these credentials. Would you like to create an account?');
          }
          throw error;
        }

        if (data.session) {
          setAuthPreference('authenticated');
          await syncPendingItems();
          onAuthSuccess?.();
          onClose();
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    const demoEmail = 'citizen.demo@janpulse.org';
    const demoPass = 'Citizen@JanPulse2025!';

    try {
      // 1. Try signing in with demo credentials
      const signInRes = await supabase.auth.signInWithPassword({
        email: demoEmail,
        password: demoPass,
      });

      if (!signInRes.error && signInRes.data.session) {
        setAuthPreference('authenticated');
        await syncPendingItems();
        onAuthSuccess?.();
        onClose();
        return;
      }

      // 2. If user doesn't exist yet, create it
      const signUpRes = await supabase.auth.signUp({
        email: demoEmail,
        password: demoPass,
      });

      if (signUpRes.data.session) {
        setAuthPreference('authenticated');
        await syncPendingItems();
        onAuthSuccess?.();
        onClose();
        return;
      }

      // 3. If email confirmation blocks demo account on remote project, fallback to guest mode
      setAuthPreference('guest');
      onAuthSuccess?.();
      onClose();
    } catch (e: any) {
      // If network fails, allow seamless entry as guest
      setAuthPreference('guest');
      onAuthSuccess?.();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4 animate-fadeIn">
      <div className="bg-white border border-black/[0.08] rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-apple-float relative text-[#1D1D1F]">
        {/* Apple Squircle Close Button */}
        <button
          type="button"
          onClick={handleContinueAsGuest}
          className="absolute top-5 right-5 text-[#86868B] hover:text-[#1D1D1F] p-1.5 rounded-full hover:bg-black/[0.05] transition-colors"
          title="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Icon & Title */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#0071E3]/10 text-[#0071E3] flex items-center justify-center mx-auto mb-3 shadow-apple-sm">
            <Lock className="w-5 h-5 stroke-[2.2]" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1D1D1F]">
            {activeTab === 'signup'
              ? 'Create Jan-Pulse Account'
              : activeTab === 'demo'
              ? 'Quick Citizen Access'
              : 'Sign in to Jan-Pulse'}
          </h2>
          <p className="text-xs text-[#86868B] mt-1.5 leading-relaxed">
            {activeTab === 'signup'
              ? 'Save your verification cards and scheme eligibility checks across all your devices.'
              : activeTab === 'demo'
              ? 'Test all cloud history and cross-device sync features with a 1-click test profile.'
              : 'Access your saved civic checks, official gazette digests, and scheme eligibility.'}
          </p>
        </div>

        {/* Apple Segmented Control Tabs */}
        <div className="bg-[#E5E5EA]/70 p-1 rounded-full flex gap-1 text-xs font-semibold border border-black/[0.04] mb-6">
          <button
            type="button"
            onClick={() => {
              setActiveTab('signin');
              setErrorMsg('');
              setSuccessMsg('');
              setOfferSignUp(false);
            }}
            className={`flex-1 py-1.5 rounded-full transition-all text-center ${
              activeTab === 'signin'
                ? 'bg-white text-[#1D1D1F] shadow-apple-sm'
                : 'text-[#86868B] hover:text-[#1D1D1F]'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('signup');
              setErrorMsg('');
              setSuccessMsg('');
              setOfferSignUp(false);
            }}
            className={`flex-1 py-1.5 rounded-full transition-all text-center ${
              activeTab === 'signup'
                ? 'bg-white text-[#1D1D1F] shadow-apple-sm'
                : 'text-[#86868B] hover:text-[#1D1D1F]'
            }`}
          >
            Create Account
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('demo');
              setErrorMsg('');
              setSuccessMsg('');
              setOfferSignUp(false);
            }}
            className={`flex-1 py-1.5 rounded-full transition-all text-center ${
              activeTab === 'demo'
                ? 'bg-white text-[#1D1D1F] shadow-apple-sm'
                : 'text-[#86868B] hover:text-[#1D1D1F]'
            }`}
          >
            1-Click Demo
          </button>
        </div>

        {/* Feedback / Alert Banners */}
        {errorMsg && (
          <div className="bg-[#FF3B30]/10 border border-[#FF3B30]/20 text-[#D70015] p-3 rounded-2xl text-xs mb-4 leading-relaxed flex items-start gap-2">
            <span className="font-bold shrink-0">!</span>
            <div className="flex-1">
              <span>{errorMsg}</span>
              {offerSignUp && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('signup');
                    setErrorMsg('');
                    setOfferSignUp(false);
                  }}
                  className="block mt-2 font-semibold text-[#0071E3] underline hover:no-underline"
                >
                  Create new account with this email →
                </button>
              )}
            </div>
          </div>
        )}

        {successMsg && (
          <div className="bg-[#34C759]/10 border border-[#34C759]/20 text-[#248A3D] p-3 rounded-2xl text-xs mb-4 leading-relaxed flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#34C759] mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {syncStatus && (
          <div className="bg-[#0071E3]/10 border border-[#0071E3]/20 text-[#0071E3] p-3 rounded-2xl text-xs mb-4 flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
            <span>{syncStatus}</span>
          </div>
        )}

        {/* Form or Demo Content */}
        {activeTab === 'demo' ? (
          <div className="space-y-4 mb-5">
            <div className="bg-[#F5F5F7] rounded-2xl p-4 border border-black/[0.04]">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#1D1D1F] mb-1">
                <Sparkles className="w-4 h-4 text-[#0071E3]" />
                <span>Instant Evaluator Profile</span>
              </div>
              <p className="text-xs text-[#86868B] leading-relaxed">
                Logs in immediately as <strong className="text-[#1D1D1F]">citizen.demo@janpulse.org</strong> with zero sign-up hassle. Ideal for local network testing with friends.
              </p>
            </div>

            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={loading}
              className="w-full py-3 px-5 bg-[#0071E3] hover:bg-[#0077ED] text-white rounded-full text-xs font-semibold transition-all shadow-apple-sm flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Logging in...</span>
                </>
              ) : (
                <>
                  <span>Sign In as Demo Citizen</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        ) : (
          <form onSubmit={handleAuthSubmit} className="space-y-3.5 mb-5">
            <div>
              <label className="block text-[11px] font-semibold text-[#86868B] uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="w-full bg-[#F5F5F7] border border-black/[0.06] rounded-xl px-3.5 py-2.5 text-xs text-[#1D1D1F] placeholder:text-[#86868B] focus:outline-none focus:border-[#0071E3] focus:bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#86868B] uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  minLength={6}
                  className="w-full bg-[#F5F5F7] border border-black/[0.06] rounded-xl px-3.5 py-2.5 text-xs text-[#1D1D1F] placeholder:text-[#86868B] focus:outline-none focus:border-[#0071E3] focus:bg-white transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-5 bg-[#0071E3] hover:bg-[#0077ED] text-white rounded-full text-xs font-semibold transition-all shadow-apple-sm flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50 mt-4"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>{activeTab === 'signup' ? 'Create Account' : 'Sign In'}</span>
              )}
            </button>
          </form>
        )}

        {/* Footer: Guest Mode */}
        <div className="pt-4 border-t border-black/[0.06] flex items-center justify-between text-xs text-[#86868B]">
          <span className="text-[11px]">No account required</span>
          <button
            type="button"
            onClick={handleContinueAsGuest}
            className="text-[11px] font-semibold text-[#0071E3] hover:text-[#0077ED] hover:underline"
          >
            Continue as Guest (Private) →
          </button>
        </div>
      </div>
    </div>
  );
};

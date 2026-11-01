'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { supabase } from '@/lib/supabase';
import { 
  deleteUserHistory, syncHistoryToCloud, fetchUserHistory 
} from '@/lib/api';
import { 
  getLocalHistory, getUnsyncedItems, markItemsAsSynced, 
  clearLocalHistory, LocalHistoryItem, setAuthPreference 
} from '@/lib/historyStore';
import { AuthModal } from '@/components/AuthModal';
import { 
  Trash2, User, Clock, ShieldCheck, Check, AlertTriangle, 
  Loader2, Lock, Cloud, CloudOff, RefreshCw, 
  ArrowRight, HardDrive, Smartphone, CheckCircle2
} from 'lucide-react';

export default function AccountPage() {
  const [language, setLanguage] = useState('en');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Local & Cloud History
  const [localItems, setLocalItems] = useState<LocalHistoryItem[]>([]);
  const [cloudItems, setCloudItems] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Deletion state
  const [isDeletingCloud, setIsDeletingCloud] = useState(false);
  const [deleteCloudSuccess, setDeleteCloudSuccess] = useState(false);
  const [clearLocalSuccess, setClearLocalSuccess] = useState(false);

  // Auth modal
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Load user and histories
  const loadData = async () => {
    setLoading(true);
    const locals = getLocalHistory();
    setLocalItems(locals);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        // Fetch saved cloud history
        try {
          const res = await fetchUserHistory();
          setCloudItems(res.history || []);
        } catch (e) {
          console.warn("Could not fetch account history:", e);
        }

        // Auto-sync any unsynced local items
        const unsynced = getUnsyncedItems();
        if (unsynced.length > 0) {
          setIsSyncing(true);
          try {
            const syncRes = await syncHistoryToCloud(unsynced);
            markItemsAsSynced(syncRes.synced_ids);
            setLocalItems(getLocalHistory());
            const refreshed = await fetchUserHistory();
            setCloudItems(refreshed.history || []);
            setSyncMessage(`Saved ${syncRes.synced_count} checks to your account.`);
            setTimeout(() => setSyncMessage(null), 4000);
          } catch (syncErr: any) {
            console.warn("Auto-sync error:", syncErr);
          } finally {
            setIsSyncing(false);
          }
        }
      } else {
        setCloudItems([]);
      }
    } catch (err) {
      console.error("Auth check error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem('janpulse_language');
      if (savedLang && (savedLang === 'en' || savedLang === 'hi')) {
        setLanguage(savedLang);
      }
    }

    const handleLangChange = (e: any) => {
      if (e.detail) setLanguage(e.detail);
    };
    window.addEventListener('janpulse_language_changed', handleLangChange);

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      loadData();
    });

    return () => {
      authListener.subscription.unsubscribe();
      window.removeEventListener('janpulse_language_changed', handleLangChange);
    };
  }, []);

  // Manual trigger for saving local items to account
  const handleManualSync = async () => {
    const unsynced = getUnsyncedItems();
    if (unsynced.length === 0) {
      alert("All searches on this device are already saved to your account.");
      return;
    }

    setIsSyncing(true);
    try {
      const syncRes = await syncHistoryToCloud(unsynced);
      markItemsAsSynced(syncRes.synced_ids);
      setLocalItems(getLocalHistory());
      const refreshed = await fetchUserHistory();
      setCloudItems(refreshed.history || []);
      setSyncMessage(`Saved ${syncRes.synced_count} checks to your account.`);
      setTimeout(() => setSyncMessage(null), 3000);
    } catch (e: any) {
      alert("Save failed: " + e.message);
    } finally {
      setIsSyncing(false);
    }
  };

  // Clear device local storage
  const handleClearLocal = () => {
    if (!confirm("Clear search history stored on this browser?")) return;
    clearLocalHistory();
    setLocalItems([]);
    setClearLocalSuccess(true);
    setTimeout(() => setClearLocalSuccess(false), 3000);
  };

  // Delete account history
  const handleDeleteCloudHistory = async () => {
    if (!confirm("Delete all searches and checks saved to your account? This action cannot be undone.")) {
      return;
    }

    setIsDeletingCloud(true);
    try {
      await deleteUserHistory();
      setCloudItems([]);
      setDeleteCloudSuccess(true);
      setTimeout(() => setDeleteCloudSuccess(false), 3000);
    } catch (e: any) {
      alert("Could not delete account history: " + e.message);
    } finally {
      setIsDeletingCloud(false);
    }
  };

  const unsyncedCount = localItems.filter(i => !i.synced).length;

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F]">
      <Navbar language={language} setLanguage={setLanguage} />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-[#0071E3]/10 text-[#0071E3] flex items-center justify-center mx-auto mb-3">
            <Lock className="w-6 h-6 stroke-[2]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1D1D1F] tracking-tight mb-2">
            Search History & Privacy
          </h1>
          <p className="text-xs sm:text-sm text-[#86868B] max-w-md mx-auto">
            Review your past fact-checks, manage sync across devices, or delete your history anytime.
          </p>
        </div>

        {/* Sync notification toast */}
        {syncMessage && (
          <div className="bg-[#34C759]/10 border border-[#34C759]/20 text-[#248A3D] p-3.5 rounded-2xl text-xs font-semibold mb-6 flex items-center gap-2 animate-fadeIn">
            <Check className="w-4 h-4 shrink-0" />
            <span>{syncMessage}</span>
          </div>
        )}

        {/* Account / Session Card */}
        <div className="bg-white border border-black/[0.06] rounded-3xl p-6 sm:p-7 shadow-[0_4px_24px_rgba(0,0,0,0.04)] mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-black/[0.06] mb-5">
            <div className="flex items-center gap-3.5">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-semibold text-lg text-white shadow-sm ${
                user ? 'bg-gradient-to-tr from-[#34C759] to-[#30D158]' : 'bg-gradient-to-tr from-[#8E8E93] to-[#AEAEB2]'
              }`}>
                {user ? <Cloud className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-base text-[#1D1D1F]">
                    {user ? user.email : "Guest Session"}
                  </h2>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    user ? 'bg-[#34C759]/15 text-[#248A3D]' : 'bg-black/[0.05] text-[#86868B]'
                  }`}>
                    {user ? 'Saved to Account' : 'Private • On This Device'}
                  </span>
                </div>
                <p className="text-xs text-[#86868B] mt-0.5">
                  {user 
                    ? "Signed in securely. Your checks stay available on all your devices." 
                    : "Searches stay on this device only and are never saved to an account."}
                </p>
              </div>
            </div>

            {user ? (
              <button
                type="button"
                onClick={async () => {
                  await supabase.auth.signOut();
                  setAuthPreference('guest');
                  loadData();
                }}
                className="px-4 py-2 rounded-full border border-black/[0.08] hover:bg-[#FF3B30]/10 hover:text-[#FF3B30] text-xs font-semibold text-[#86868B] transition-colors self-start sm:self-auto"
              >
                Sign Out
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="px-5 py-2.5 rounded-full bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 self-start sm:self-auto"
              >
                <User className="w-3.5 h-3.5" />
                <span>Sign In to Save History</span>
              </button>
            )}
          </div>

          {/* Quick Counter Pills */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-[#F5F5F7] rounded-2xl p-4 border border-black/[0.04]">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#86868B] mb-1">
                <Smartphone className="w-3.5 h-3.5 text-[#0071E3]" />
                <span>On This Device</span>
              </div>
              <div className="text-xl font-bold text-[#1D1D1F]">
                {localItems.length} <span className="text-xs font-normal text-[#86868B]">checks</span>
              </div>
            </div>

            <div className="bg-[#F5F5F7] rounded-2xl p-4 border border-black/[0.04]">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#86868B] mb-1">
                <Cloud className="w-3.5 h-3.5 text-[#248A3D]" />
                <span>Saved to Account</span>
              </div>
              <div className="text-xl font-bold text-[#1D1D1F]">
                {user ? cloudItems.length : 0} <span className="text-xs font-normal text-[#86868B]">checks</span>
              </div>
            </div>

            <div className="bg-[#F5F5F7] rounded-2xl p-4 border border-black/[0.04]">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#86868B] mb-1">
                <CloudOff className="w-3.5 h-3.5 text-[#FF9500]" />
                <span>Ready to Save</span>
              </div>
              <div className="text-xl font-bold text-[#1D1D1F]">
                {unsyncedCount} <span className="text-xs font-normal text-[#86868B]">unsaved</span>
              </div>
            </div>
          </div>

          {/* Prompt if user is signed in and has unsynced device items */}
          {user && unsyncedCount > 0 && (
            <div className="mt-4 p-4 rounded-2xl bg-[#0071E3]/5 border border-[#0071E3]/15 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-xs text-[#1D1D1F]">
                <Cloud className="w-4 h-4 text-[#0071E3] shrink-0" />
                <span>You have <strong>{unsyncedCount}</strong> checks on this device ready to save to your account.</span>
              </div>
              <button
                type="button"
                onClick={handleManualSync}
                disabled={isSyncing}
                className="px-3.5 py-1.5 rounded-full bg-[#0071E3] text-white text-xs font-semibold hover:bg-[#0077ED] transition-colors flex items-center gap-1.5 shrink-0"
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Save to Account</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* History List Section */}
        <div className="bg-white border border-black/[0.06] rounded-3xl p-6 sm:p-7 shadow-[0_4px_24px_rgba(0,0,0,0.04)] mb-6">
          <div className="flex items-center justify-between pb-4 border-b border-black/[0.06] mb-4">
            <div>
              <h3 className="font-bold text-base text-[#1D1D1F]">Your Search History</h3>
              <p className="text-xs text-[#86868B]">
                {user ? "All checks saved to your account and on this device" : "Checks saved on this browser only"}
              </p>
            </div>
            {localItems.length > 0 && (
              <button
                type="button"
                onClick={handleClearLocal}
                className="text-xs font-semibold text-[#86868B] hover:text-[#FF3B30] flex items-center gap-1 transition-colors"
                title="Clear history from this browser"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Device History</span>
              </button>
            )}
          </div>

          {clearLocalSuccess && (
            <div className="p-3 mb-4 rounded-xl bg-[#34C759]/10 text-[#248A3D] text-xs font-semibold flex items-center gap-1.5 animate-fadeIn">
              <Check className="w-3.5 h-3.5" />
              <span>History cleared from this device.</span>
            </div>
          )}

          {localItems.length === 0 && cloudItems.length === 0 ? (
            <div className="text-center py-10 text-[#86868B]">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-semibold text-[#1D1D1F]">No search history yet</p>
              <p className="text-xs mt-1">Check viral forwards or look up government schemes to see your history appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Local Items */}
              {localItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-[#F5F5F7] rounded-2xl p-4 border border-black/[0.04] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-black/[0.05] text-[#86868B]">
                        {item.kind === 'forward' ? 'Viral Forward' : item.kind === 'eligibility' ? 'Scheme Check' : 'Notification'}
                      </span>
                      {item.label && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          item.label === 'true' || item.label === 'supported' ? 'bg-[#34C759]/15 text-[#248A3D]' :
                          item.label === 'contradicted' ? 'bg-[#FF3B30]/15 text-[#D70015]' :
                          'bg-[#FF9500]/15 text-[#B25000]'
                        }`}>
                          {item.label === 'true' || item.label === 'supported' ? 'Official Record' :
                           item.label === 'contradicted' ? 'Contradicted' : item.label}
                        </span>
                      )}
                      <span className="text-[10px] text-[#86868B] font-mono">
                        {new Date(item.timestamp).toLocaleDateString()}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-[#1D1D1F] line-clamp-2">
                      {item.query}
                    </p>

                    {item.explanation && (
                      <p className="text-[11px] text-[#6E6E73] line-clamp-1 mt-1">
                        {item.explanation}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                    {item.synced ? (
                      <span className="text-[10px] font-medium text-[#248A3D] flex items-center gap-1 bg-[#34C759]/10 px-2.5 py-1 rounded-full">
                        <Cloud className="w-3 h-3" />
                        <span>Saved to Account</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-[#86868B] flex items-center gap-1 bg-black/[0.05] px-2.5 py-1 rounded-full" title="Stored on this device only">
                        <Lock className="w-3 h-3" />
                        <span>This Device Only</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {/* Cloud Items if not already in local */}
              {user && cloudItems.map((c, idx) => {
                const queryText = c.raw_text || c.input_text || c.query;
                // If query is already shown in local list, skip to avoid duplicate rendering
                if (localItems.some(l => l.query === queryText)) return null;

                return (
                  <div
                    key={`cloud_${idx}`}
                    className="bg-[#F5F5F7] rounded-2xl p-4 border border-black/[0.04] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-black/[0.05] text-[#86868B]">
                          {c.kind === 'forward' ? 'Viral Forward' : c.kind === 'eligibility' ? 'Scheme Check' : 'Notification'}
                        </span>
                        {c.verdict_label && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            c.verdict_label === 'true' || c.verdict_label === 'supported' ? 'bg-[#34C759]/15 text-[#248A3D]' :
                            c.verdict_label === 'contradicted' ? 'bg-[#FF3B30]/15 text-[#D70015]' :
                            'bg-[#FF9500]/15 text-[#B25000]'
                          }`}>
                            {c.verdict_label === 'true' || c.verdict_label === 'supported' ? 'Official Record' :
                             c.verdict_label === 'contradicted' ? 'Contradicted' : c.verdict_label}
                          </span>
                        )}
                        {c.created_at && (
                          <span className="text-[10px] text-[#86868B] font-mono">
                            {new Date(c.created_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-[#1D1D1F] line-clamp-2">
                        {queryText}
                      </p>
                      {c.explanation && (
                        <p className="text-[11px] text-[#6E6E73] line-clamp-1 mt-1">
                          {c.explanation}
                        </p>
                      )}
                    </div>

                    <div className="shrink-0 self-start sm:self-auto">
                      <span className="text-[10px] font-medium text-[#248A3D] flex items-center gap-1 bg-[#34C759]/10 px-2.5 py-1 rounded-full">
                        <Cloud className="w-3 h-3" />
                        <span>Saved to Account</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Delete Account History (only for signed-in users) */}
        {user && (
          <div className="bg-white border border-black/[0.06] rounded-3xl p-6 sm:p-7 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-6 h-6 rounded-lg bg-[#FF3B30]/10 text-[#FF3B30] flex items-center justify-center">
                <AlertTriangle className="w-3.5 h-3.5" />
              </div>
              <h3 className="font-bold text-sm text-[#1D1D1F]">
                Delete Account History
              </h3>
            </div>
            <p className="text-xs text-[#86868B] leading-relaxed mb-5">
              Permanently delete all searches and checks saved to your account.
            </p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleDeleteCloudHistory}
                disabled={isDeletingCloud}
                className="px-5 py-2.5 bg-[#FF3B30]/10 hover:bg-[#FF3B30]/15 text-[#FF3B30] font-semibold rounded-full text-xs flex items-center gap-2 transition-all active:scale-95 disabled:opacity-40"
              >
                {isDeletingCloud ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting records...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Account History</span>
                  </>
                )}
              </button>

              {deleteCloudSuccess && (
                <span className="text-xs text-[#248A3D] font-semibold flex items-center gap-1 animate-fadeIn">
                  <Check className="w-4 h-4" />
                  <span>Account history deleted</span>
                </span>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Embedded Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialView="auth"
        onAuthSuccess={() => loadData()}
      />
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { supabase } from '@/lib/supabase';
import { deleteUserHistory } from '@/lib/api';
import { Trash2, User, Clock, ShieldCheck, Check, AlertTriangle, Loader2, Lock } from 'lucide-react';

export default function AccountPage() {
  const [language, setLanguage] = useState('en');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });
  }, []);

  const handleDeleteHistory = async () => {
    if (!confirm("Are you sure you want to delete all your verification queries and runs? This action is permanent and cannot be undone.")) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteUserHistory();
      setDeleteSuccess(true);
      setTimeout(() => setDeleteSuccess(false), 3000);
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F]">
      <Navbar language={language} setLanguage={setLanguage} />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-full bg-[#0071E3]/10 text-[#0071E3] flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7" strokeWidth={1.8} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1D1D1F] tracking-tight mb-2">
            Account & Privacy Control
          </h1>
          <p className="text-xs sm:text-sm text-[#86868B]">
            Exercise full ownership over your stored query history and privacy preferences.
          </p>
        </div>

        {/* Profile Card */}
        <div className="bg-white border border-black/[0.06] rounded-3xl p-6 sm:p-7 shadow-[0_4px_24px_rgba(0,0,0,0.04)] mb-6">
          <div className="flex items-center gap-4 pb-5 border-b border-black/[0.06] mb-5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#0071E3] to-[#47A3FF] text-white flex items-center justify-center font-semibold text-lg shadow-sm">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-semibold text-base text-[#1D1D1F]">
                {user?.is_anonymous ? "Anonymous Citizen Session" : user?.email || "Citizen User"}
              </h2>
              <span className="text-xs text-[#86868B] font-mono">
                {user?.id ? `ID: ${user.id.slice(0, 18)}...` : "Authenticated via Supabase Row-Level Security"}
              </span>
            </div>
          </div>

          <div className="space-y-3.5 text-xs text-[#6E6E73]">
            <div className="flex items-center gap-2.5">
              <div className="w-5 h-5 rounded-full bg-[#34C759]/15 text-[#248A3D] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
              <span>Row-Level Security (RLS) strictly isolates queries to your own anonymous or authenticated session.</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-5 h-5 rounded-full bg-[#0071E3]/15 text-[#0071E3] flex items-center justify-center shrink-0">
                <Clock className="w-3.5 h-3.5" />
              </div>
              <span>Uploaded screenshots and voice clips are stored temporarily and can be purged anytime.</span>
            </div>
          </div>
        </div>

        {/* Data Deletion Bento Card */}
        <div className="bg-white border border-black/[0.06] rounded-3xl p-6 sm:p-7 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-6 h-6 rounded-lg bg-[#FF3B30]/10 text-[#FF3B30] flex items-center justify-center">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
            <h3 className="font-semibold text-sm text-[#1D1D1F]">
              Erase Verification History
            </h3>
          </div>
          <p className="text-xs text-[#86868B] leading-relaxed mb-5">
            Permanently delete all your query logs, extracted claims, and associated trace events from the database.
          </p>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleDeleteHistory}
              disabled={isDeleting}
              className="px-5 py-2.5 bg-[#FF3B30]/10 hover:bg-[#FF3B30]/15 text-[#FF3B30] font-semibold rounded-full text-xs flex items-center gap-2 transition-all active:scale-95 disabled:opacity-40"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Deleting records...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete All History</span>
                </>
              )}
            </button>

            {deleteSuccess && (
              <span className="text-xs text-[#248A3D] font-semibold flex items-center gap-1 animate-fadeIn">
                <Check className="w-4 h-4" />
                <span>History successfully erased</span>
              </span>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

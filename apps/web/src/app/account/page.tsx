'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { supabase } from '@/lib/supabase';
import { deleteUserHistory } from '@/lib/api';
import { Trash2, User, Clock, ShieldCheck, Check, AlertTriangle, Loader2 } from 'lucide-react';

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
    if (!confirm("Are you sure you want to delete all your verification queries and runs? This cannot be undone.")) {
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
    <>
      <Navbar language={language} setLanguage={setLanguage} />

      <main className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="font-serif text-3xl font-bold text-[#1E2430] mb-2">
          Your Account & Privacy Control
        </h1>
        <p className="text-sm text-[#4B5563] mb-8">
          Manage your session and exercise full control over your stored history and query traces.
        </p>

        <div className="bg-white border border-[#E7E2D8] rounded-lg p-6 shadow-sm mb-6">
          <div className="flex items-center gap-3 pb-4 border-b border-[#E7E2D8] mb-4">
            <div className="w-10 h-10 rounded-full bg-[#E4EFEB] text-[#2F6B5C] flex items-center justify-center font-medium">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-medium text-sm text-[#1E2430]">
                {user?.is_anonymous ? "Anonymous Citizen Session" : user?.email || "Citizen User"}
              </h2>
              <span className="text-xs text-[#6B7280]">
                {user?.id ? `ID: ${user.id.slice(0, 16)}...` : "Session authenticated via Supabase RLS"}
              </span>
            </div>
          </div>

          <div className="space-y-3 text-xs text-[#4B5563]">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#2F6B5C]" />
              <span>Row-Level Security (RLS) restricts access solely to your own queries.</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#2F6B5C]" />
              <span>Uploaded audio and media files are stored for max 24 hours.</span>
            </div>
          </div>
        </div>

        {/* Delete history */}
        <div className="bg-[#FBF9F5] border border-[#E7E2D8] rounded-lg p-6">
          <h3 className="font-medium text-sm text-[#1E2430] mb-1 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#8E3326]" />
            <span>Data Deletion</span>
          </h3>
          <p className="text-xs text-[#6B7280] leading-relaxed mb-4">
            Permanently erase all your check history, traces, and associated claims from the Jan-Pulse database.
          </p>

          <button
            type="button"
            onClick={handleDeleteHistory}
            disabled={isDeleting}
            className="px-4 py-2 bg-white hover:bg-[#F7E4E0] text-[#8E3326] border border-[#E7E2D8] rounded-md text-xs font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : deleteSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#2B5C42]" />
                <span className="text-[#2B5C42]">History Erased</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Erase My History</span>
              </>
            )}
          </button>
        </div>
      </main>
    </>
  );
}


'use client';

import React, { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { createRunStream } from '@/lib/api';
import { 
  FileText, Calendar, Users, AlertTriangle, CheckSquare, 
  ArrowRight, Loader2, Link2, ExternalLink, ShieldCheck, Clock
} from 'lucide-react';

export default function ExplainNotificationPage() {
  const [language, setLanguage] = useState('en');
  const [urlOrText, setUrlOrText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleExplain = async () => {
    if (!urlOrText.trim()) return;
    setIsLoading(true);
    setResult(null);

    try {
      await createRunStream(
        urlOrText,
        'notification',
        language,
        (event) => {
          if (event.type === 'notification_result') {
            setResult(event);
            setIsLoading(false);
          }
        },
        (err) => {
          alert(`Explanation failed: ${err.message}`);
          setIsLoading(false);
        }
      );
    } catch (e: any) {
      setIsLoading(false);
      alert(e.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F]">
      <Navbar language={language} setLanguage={setLanguage} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        {/* Apple Hero */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0071E3]/10 text-[#0071E3] text-xs font-semibold mb-4 tracking-tight">
            <FileText className="w-3.5 h-3.5" />
            <span>e-Gazette & Regulatory Digest</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-[#1D1D1F] tracking-tight leading-[1.15] mb-4">
            Demystify government circulars & gazettes.
          </h1>
          <p className="text-[#6E6E73] text-base sm:text-lg leading-relaxed font-normal">
            Paste an official government notification link or text to get an instant breakdown of who is affected, key deadlines, and next steps.
          </p>
        </div>

        {/* Input Bento Card */}
        <div className="bg-white rounded-3xl border border-black/[0.06] p-6 sm:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.04)] mb-8">
          <div className="mb-4">
            <label className="block text-xs font-semibold text-[#86868B] uppercase tracking-wider mb-2">
              Official Notification URL or Text
            </label>
            <input
              type="text"
              value={urlOrText}
              onChange={(e) => setUrlOrText(e.target.value)}
              placeholder="https://egazette.gov.in/... or paste legal notification text"
              className="w-full bg-[#F5F5F7]/60 hover:bg-[#F5F5F7] focus:bg-white border border-transparent focus:border-[#0071E3] focus:ring-4 focus:ring-[#0071E3]/15 rounded-2xl px-4 py-3.5 text-sm sm:text-base text-[#1D1D1F] placeholder-[#86868B] outline-none transition-all"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <span className="text-xs text-[#86868B] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#0071E3]" />
              <span>Supports allowlisted official Indian government domains (.gov.in / .nic.in).</span>
            </span>
            <button
              type="button"
              onClick={handleExplain}
              disabled={isLoading || !urlOrText.trim()}
              className="w-full sm:w-auto px-7 py-3 bg-[#0071E3] hover:bg-[#0077ED] text-white font-semibold rounded-full text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_2px_12px_rgba(0,113,227,0.28)] active:scale-[0.98] transition-all disabled:opacity-40"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Extracting impact...</span>
                </>
              ) : (
                <>
                  <span>Explain Notification</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results Bento Grid */}
        {result && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white border border-black/[0.06] rounded-3xl p-6 sm:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
              <div className="border-b border-black/[0.06] pb-5 mb-6">
                <span className="text-xs font-semibold text-[#0071E3] uppercase tracking-wider">
                  Plain-Language Summary
                </span>
                <h2 className="text-2xl font-bold text-[#1D1D1F] mt-1 tracking-tight">
                  {result.title}
                </h2>
                <div className="flex flex-wrap items-center gap-3 text-xs text-[#86868B] mt-2.5">
                  <span className="bg-black/[0.04] px-2.5 py-0.5 rounded-full font-medium">Source: {result.publisher}</span>
                  {result.effective_date && (
                    <span className="flex items-center gap-1 font-semibold text-[#1D1D1F] bg-[#0071E3]/10 text-[#0071E3] px-2.5 py-0.5 rounded-full">
                      <Calendar className="w-3.5 h-3.5" />
                      Effective Date: {result.effective_date}
                    </span>
                  )}
                </div>
              </div>

              {/* Bento breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                {/* Who is affected */}
                <div className="bg-[#F5F5F7] border border-black/[0.04] rounded-2xl p-5">
                  <h3 className="font-semibold text-sm text-[#1D1D1F] mb-2.5 flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#0071E3]" />
                    <span>Who is affected:</span>
                  </h3>
                  <ul className="list-disc list-inside text-xs text-[#6E6E73] space-y-1.5 leading-relaxed">
                    {result.who_is_affected?.map((w: string, i: number) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>

                {/* What changes */}
                <div className="bg-[#F5F5F7] border border-black/[0.04] rounded-2xl p-5">
                  <h3 className="font-semibold text-sm text-[#1D1D1F] mb-2.5 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#0071E3]" />
                    <span>What changes:</span>
                  </h3>
                  <ul className="list-disc list-inside text-xs text-[#6E6E73] space-y-1.5 leading-relaxed">
                    {result.what_changes?.map((c: string, i: number) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Deadlines & Penalties */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                {result.deadlines && result.deadlines.length > 0 && (
                  <div className="bg-[#FF9500]/10 border border-[#FF9500]/20 rounded-2xl p-5 text-[#B25000]">
                    <h3 className="font-semibold text-sm mb-2.5 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>Deadlines & Milestones:</span>
                    </h3>
                    <ul className="list-disc list-inside text-xs space-y-1.5 leading-relaxed">
                      {result.deadlines.map((d: string, i: number) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.penalties_or_actions && result.penalties_or_actions.length > 0 && (
                  <div className="bg-[#FF3B30]/10 border border-[#FF3B30]/20 rounded-2xl p-5 text-[#D70015]">
                    <h3 className="font-semibold text-sm mb-2.5 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Penalties or Consequences:</span>
                    </h3>
                    <ul className="list-disc list-inside text-xs space-y-1.5 leading-relaxed">
                      {result.penalties_or_actions.map((p: string, i: number) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Action items */}
              {result.what_to_do_next && result.what_to_do_next.length > 0 && (
                <div className="bg-[#34C759]/10 border border-[#34C759]/20 rounded-2xl p-5 text-[#248A3D]">
                  <h3 className="font-semibold text-sm mb-2.5 flex items-center gap-2">
                    <CheckSquare className="w-4 h-4" />
                    <span>What to do next:</span>
                  </h3>
                  <ol className="list-decimal list-inside text-xs space-y-1.5 leading-relaxed">
                    {result.what_to_do_next.map((act: string, i: number) => (
                      <li key={i}>{act}</li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

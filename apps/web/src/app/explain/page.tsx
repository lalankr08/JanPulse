'use client';

import React, { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { createRunStream } from '@/lib/api';
import { 
  FileText, Calendar, Users, AlertTriangle, CheckSquare, 
  ArrowRight, Loader2, Link2, ExternalLink
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
    <>
      <Navbar language={language} setLanguage={setLanguage} />

      <main className="max-w-4xl mx-auto px-4 py-10">
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#1E2430] mb-3">
            Government Notification Explainer
          </h1>
          <p className="text-[#4B5563] text-base max-w-xl mx-auto leading-relaxed">
            Paste an official government gazette / circular link (e.g. from e-Gazette, Ministry sites) or document text to get a plain-language breakdown of who is affected and what to do next.
          </p>
        </div>

        {/* Input Card */}
        <div className="bg-white border border-[#E7E2D8] rounded-lg p-6 shadow-sm mb-8">
          <div className="mb-4">
            <label className="block text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-2">
              Official Notification Link or Gazette Content
            </label>
            <input
              type="text"
              value={urlOrText}
              onChange={(e) => setUrlOrText(e.target.value)}
              placeholder="https://egazette.gov.in/... or paste legal notification text"
              className="w-full border border-[#E7E2D8] rounded-md px-4 py-3 text-sm text-[#1E2430] placeholder-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#2F6B5C]"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <span className="text-xs text-[#6B7280]">
              Supports allowlisted official Indian government domains (.gov.in / .nic.in).
            </span>
            <button
              type="button"
              onClick={handleExplain}
              disabled={isLoading || !urlOrText.trim()}
              className="w-full sm:w-auto px-6 py-2.5 bg-[#2F6B5C] hover:bg-[#25574a] text-white font-medium rounded-md text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
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

        {/* Results */}
        {result && (
          <div className="space-y-6">
            <div className="bg-white border border-[#E7E2D8] rounded-lg p-6 shadow-sm">
              <div className="border-b border-[#E7E2D8] pb-4 mb-6">
                <span className="text-xs font-semibold text-[#2F6B5C] uppercase tracking-wider">
                  Plain-Language Summary
                </span>
                <h2 className="font-serif text-2xl font-bold text-[#1E2430] mt-1">
                  {result.title}
                </h2>
                <div className="flex flex-wrap items-center gap-4 text-xs text-[#6B7280] mt-2">
                  <span>Source: {result.publisher}</span>
                  {result.effective_date && (
                    <span className="flex items-center gap-1 font-medium text-[#1E2430]">
                      <Calendar className="w-3.5 h-3.5 text-[#2F6B5C]" />
                      Effective Date: {result.effective_date}
                    </span>
                  )}
                </div>
              </div>

              {/* Grid breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Who is affected */}
                <div className="bg-[#FBF9F5] border border-[#E7E2D8] rounded-md p-4">
                  <h3 className="font-medium text-sm text-[#1E2430] mb-2 flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#2F6B5C]" />
                    <span>Who is affected:</span>
                  </h3>
                  <ul className="list-disc list-inside text-xs text-[#4B5563] space-y-1 leading-relaxed">
                    {result.who_is_affected?.map((w: string, i: number) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>

                {/* What changes */}
                <div className="bg-[#FBF9F5] border border-[#E7E2D8] rounded-md p-4">
                  <h3 className="font-medium text-sm text-[#1E2430] mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#2F6B5C]" />
                    <span>What changes:</span>
                  </h3>
                  <ul className="list-disc list-inside text-xs text-[#4B5563] space-y-1 leading-relaxed">
                    {result.what_changes?.map((c: string, i: number) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Deadlines & Penalties */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {result.deadlines && result.deadlines.length > 0 && (
                  <div className="bg-[#F6ECD3] border border-[#E7E2D8] rounded-md p-4 text-[#7A5413]">
                    <h3 className="font-medium text-sm mb-2 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>Deadlines & Milestones:</span>
                    </h3>
                    <ul className="list-disc list-inside text-xs space-y-1">
                      {result.deadlines.map((d: string, i: number) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.penalties_or_actions && result.penalties_or_actions.length > 0 && (
                  <div className="bg-[#F7E4E0] border border-[#E7E2D8] rounded-md p-4 text-[#8E3326]">
                    <h3 className="font-medium text-sm mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Penalties or Consequences:</span>
                    </h3>
                    <ul className="list-disc list-inside text-xs space-y-1">
                      {result.penalties_or_actions.map((p: string, i: number) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Action items */}
              {result.what_to_do_next && result.what_to_do_next.length > 0 && (
                <div className="bg-[#E6F0E9] border border-[#E7E2D8] rounded-md p-4 text-[#2B5C42]">
                  <h3 className="font-medium text-sm mb-2 flex items-center gap-2">
                    <CheckSquare className="w-4 h-4" />
                    <span>What to do next:</span>
                  </h3>
                  <ol className="list-decimal list-inside text-xs space-y-1">
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
    </>
  );
}


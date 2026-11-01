'use client';

import React, { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { createRunStream } from '@/lib/api';
import { addLocalHistoryItem } from '@/lib/historyStore';
import { 
  Building2, CheckCircle2, XCircle, HelpCircle, ArrowRight, 
  Loader2, Sparkles, FileCheck, Layers, ExternalLink, Search, Check, AlertTriangle
} from 'lucide-react';

export default function SchemesPage() {
  const [language, setLanguage] = useState('en');

  React.useEffect(() => {
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
    return () => window.removeEventListener('janpulse_language_changed', handleLangChange);
  }, []);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentStepMessage, setCurrentStepMessage] = useState('');
  
  // Multi-scheme results
  const [schemes, setSchemes] = useState<any[]>([]);
  const [selectedSchemeIndex, setSelectedSchemeIndex] = useState(0);

  // User interactive answer tracking per scheme
  const [answersByScheme, setAnswersByScheme] = useState<Record<number, Record<number, string>>>({});

  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsLoading(true);
    setSchemes([]);
    setSelectedSchemeIndex(0);
    setAnswersByScheme({});
    setCurrentStepMessage('Searching official government scheme registry...');

    try {
      await createRunStream(
        query,
        'eligibility',
        language,
        (event) => {
          if (event.type === 'step_start') {
            setCurrentStepMessage(event.message || 'Processing...');
          } else if (event.type === 'eligibility_result') {
            const list = event.schemes || (event.scheme_name ? [event] : []);
            setSchemes(list);
            setIsLoading(false);
            setCurrentStepMessage('');

            addLocalHistoryItem({
              query,
              kind: 'eligibility',
              label: list[0]?.scheme_name || 'Scheme Match',
              explanation: list[0]?.benefit_summary || `Found ${list.length} eligible schemes`
            }, Boolean(event.saved_to_cloud));
          }
        },
        (err) => {
          alert(`Failed to fetch schemes: ${err.message}`);
          setIsLoading(false);
        }
      );
    } catch (e: any) {
      setIsLoading(false);
      alert(e.message);
    }
  };

  const activeScheme = schemes[selectedSchemeIndex];
  const activeAnswers = answersByScheme[selectedSchemeIndex] || {};

  const handleSelectAnswer = (criterionIdx: number, status: 'met' | 'not_met') => {
    setAnswersByScheme(prev => ({
      ...prev,
      [selectedSchemeIndex]: {
        ...(prev[selectedSchemeIndex] || {}),
        [criterionIdx]: status
      }
    }));
  };

  // Determine eligibility calculation for the currently selected scheme
  const totalCriteria = activeScheme?.criteria?.length || 0;
  const answeredCount = Object.keys(activeAnswers).length;
  const hasNotMet = Object.values(activeAnswers).includes('not_met');
  const allMet = answeredCount === totalCriteria && !hasNotMet && totalCriteria > 0;

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F]">
      <Navbar language={language} setLanguage={setLanguage} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        {/* Apple Hero */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0071E3]/10 text-[#0071E3] text-xs font-semibold mb-4 tracking-tight">
            <Building2 className="w-3.5 h-3.5" />
            <span>myScheme Official Registry Integration</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-[#1D1D1F] tracking-tight leading-[1.15] mb-4">
            Find government schemes you qualify for.
          </h1>
          <p className="text-[#6E6E73] text-base sm:text-lg leading-relaxed font-normal">
            Describe your situation (e.g. farmer, small business loan, housing, women entrepreneur, pension) to extract official criteria and compare eligibility.
          </p>
        </div>

        {/* Search Bar Bento Card */}
        <div className="bg-white rounded-3xl border border-black/[0.06] p-3 sm:p-4 shadow-[0_4px_24px_rgba(0,0,0,0.04)] mb-8 flex flex-col sm:flex-row items-center gap-3">
          <div className="flex-1 flex items-center gap-3 px-3 w-full">
            <Search className="w-5 h-5 text-[#86868B] shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search scheme or situation (e.g. farmer crop loan, rural house, elderly pension)..."
              className="w-full bg-transparent text-sm sm:text-base text-[#1D1D1F] placeholder-[#86868B] outline-none"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <button
            type="button"
            onClick={handleSearch}
            disabled={isLoading || !query.trim()}
            className="w-full sm:w-auto px-6 py-3 bg-[#0071E3] hover:bg-[#0077ED] text-white font-semibold rounded-full text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_2px_12px_rgba(0,113,227,0.28)] active:scale-[0.98] transition-all disabled:opacity-40"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Discover Schemes</span>}
          </button>
        </div>

        {/* Loading status */}
        {isLoading && (
          <div className="bg-white border border-black/[0.06] rounded-2xl p-4 mb-6 flex items-center gap-3 shadow-sm animate-fadeIn">
            <Loader2 className="w-4 h-4 animate-spin text-[#0071E3]" />
            <p className="text-xs sm:text-sm text-[#1D1D1F] font-semibold">{currentStepMessage}</p>
          </div>
        )}

        {/* Results */}
        {schemes.length > 0 && activeScheme && (
          <div className="space-y-6 animate-fadeIn">
            {/* Multi-scheme navigation pills */}
            <div className="bg-white border border-black/[0.06] rounded-3xl p-4 sm:p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Layers className="w-4 h-4 text-[#0071E3]" />
                <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider">
                  Matching Schemes ({schemes.length}):
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {schemes.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedSchemeIndex(idx)}
                    className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                      selectedSchemeIndex === idx
                        ? 'bg-[#0071E3] text-white shadow-sm shadow-[#0071E3]/30 scale-[1.02]'
                        : 'bg-[#F5F5F7] text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#EBEBF0]'
                    }`}
                  >
                    <span>{s.scheme_name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Active Scheme Detailed Card */}
            <div className="bg-white border border-black/[0.06] rounded-3xl p-6 sm:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/[0.06] pb-5 mb-6">
                <div>
                  <span className="text-xs font-semibold text-[#0071E3] uppercase tracking-wider">
                    {activeScheme.category || "Government of India Scheme"}
                  </span>
                  <h2 className="text-2xl font-bold text-[#1D1D1F] mt-1 tracking-tight">
                    {activeScheme.scheme_name}
                  </h2>
                </div>
                <a
                  href={activeScheme.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#0071E3] hover:text-[#0077ED] font-semibold flex items-center gap-1 group shrink-0"
                >
                  <span>View on myScheme.gov.in</span>
                  <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </a>
              </div>

              {/* Status summary */}
              <div className="p-4 sm:p-5 rounded-2xl mb-6 flex items-center gap-3.5 border transition-all">
                {hasNotMet ? (
                  <div className="bg-[#FF3B30]/10 border border-[#FF3B30]/20 rounded-2xl p-4 flex items-center gap-3 w-full">
                    <XCircle className="w-6 h-6 text-[#FF3B30] shrink-0" />
                    <div>
                      <h4 className="text-sm font-semibold text-[#FF3B30]">May not qualify</h4>
                      <p className="text-xs text-[#6E6E73] mt-0.5">Based on your selection, one or more official requirements are not met.</p>
                    </div>
                  </div>
                ) : allMet ? (
                  <div className="bg-[#34C759]/10 border border-[#34C759]/20 rounded-2xl p-4 flex items-center gap-3 w-full">
                    <CheckCircle2 className="w-6 h-6 text-[#248A3D] shrink-0" />
                    <div>
                      <h4 className="text-sm font-semibold text-[#248A3D]">You appear eligible</h4>
                      <p className="text-xs text-[#6E6E73] mt-0.5">All extracted conditions match your profile according to official lines.</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#0071E3]/10 border border-[#0071E3]/20 rounded-2xl p-4 flex items-center gap-3 w-full">
                    <HelpCircle className="w-6 h-6 text-[#0071E3] shrink-0" />
                    <div>
                      <h4 className="text-sm font-semibold text-[#0071E3]">
                        Check eligibility ({answeredCount} of {totalCriteria} checked)
                      </h4>
                      <p className="text-xs text-[#6E6E73] mt-0.5">Click 'Yes' or 'No' on each condition below to verify.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Criteria List */}
              <h3 className="font-semibold text-sm text-[#1D1D1F] mb-3">Eligibility Conditions:</h3>
              <div className="space-y-3 mb-6">
                {activeScheme.criteria?.map((c: any, idx: number) => {
                  const state = activeAnswers[idx];
                  return (
                    <div 
                      key={idx}
                      className={`p-4 rounded-2xl border text-xs transition-all ${
                        state === 'met'
                          ? 'border-[#34C759]/30 bg-[#34C759]/5'
                          : state === 'not_met'
                          ? 'border-[#FF3B30]/30 bg-[#FF3B30]/5'
                          : 'border-black/[0.06] bg-[#F5F5F7]'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <p className="text-[#1D1D1F] font-medium leading-relaxed sm:max-w-md">
                          {c.criterion}
                        </p>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleSelectAnswer(idx, 'met')}
                            className={`px-3.5 py-1.5 rounded-full font-semibold text-xs transition-all active:scale-95 ${
                              state === 'met' 
                                ? 'bg-[#34C759] text-white shadow-sm' 
                                : 'bg-white border border-black/[0.08] text-[#1D1D1F] hover:bg-[#EBEBF0]'
                            }`}
                          >
                            Yes / Met
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSelectAnswer(idx, 'not_met')}
                            className={`px-3.5 py-1.5 rounded-full font-semibold text-xs transition-all active:scale-95 ${
                              state === 'not_met' 
                                ? 'bg-[#FF3B30] text-white shadow-sm' 
                                : 'bg-white border border-black/[0.08] text-[#1D1D1F] hover:bg-[#EBEBF0]'
                            }`}
                          >
                            No / Not met
                          </button>
                        </div>
                      </div>
                      {c.source_span && (
                        <p className="text-[11px] text-[#86868B] italic mt-2.5 pt-2 border-t border-black/[0.05]">
                          Official wording: "{c.source_span}"
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Documents Needed */}
              {activeScheme.documents && activeScheme.documents.length > 0 && (
                <div className="mb-6 pt-5 border-t border-black/[0.06]">
                  <h3 className="font-semibold text-sm text-[#1D1D1F] mb-3 flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-[#0071E3]" />
                    <span>Documents Required:</span>
                  </h3>
                  <ul className="list-disc list-inside text-xs text-[#6E6E73] space-y-1.5 leading-relaxed bg-[#F5F5F7] p-4 rounded-2xl border border-black/[0.04]">
                    {activeScheme.documents.map((doc: string, dIdx: number) => (
                      <li key={dIdx}>{doc}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Application steps */}
              {activeScheme.apply_steps && activeScheme.apply_steps.length > 0 && (
                <div className="mb-5 pt-5 border-t border-black/[0.06]">
                  <h3 className="font-semibold text-sm text-[#1D1D1F] mb-3">How to Apply:</h3>
                  <ol className="list-decimal list-inside text-xs text-[#6E6E73] space-y-1.5 leading-relaxed bg-[#F5F5F7] p-4 rounded-2xl border border-black/[0.04]">
                    {activeScheme.apply_steps.map((st: string, sIdx: number) => (
                      <li key={sIdx}>{st}</li>
                    ))}
                  </ol>
                </div>
              )}

              <p className="text-[11px] text-[#86868B] italic pt-3 border-t border-black/[0.06]">
                {activeScheme.disclaimer}
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

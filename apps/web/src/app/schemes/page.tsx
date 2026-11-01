'use client';

import React, { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { createRunStream } from '@/lib/api';
import { 
  Building2, CheckCircle2, XCircle, HelpCircle, ArrowRight, 
  Loader2, Sparkles, FileCheck, Layers, ExternalLink 
} from 'lucide-react';

export default function SchemesPage() {
  const [language, setLanguage] = useState('en');
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
    setCurrentStepMessage('Searching official government registry...');

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
          }
        },
        (err) => {
          alert(`Failed to fetch scheme: ${err.message}`);
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
    <>
      <Navbar language={language} setLanguage={setLanguage} />

      <main className="max-w-4xl mx-auto px-4 py-10">
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#1E2430] mb-3">
            Government Scheme Finder & Eligibility
          </h1>
          <p className="text-[#4B5563] text-base max-w-xl mx-auto leading-relaxed">
            Search by keyword or situation (e.g. "farmer", "housing", "business loan", "women entrepreneur", "pension") to discover all matching official schemes and compare their eligibility rules.
          </p>
        </div>

        {/* Search input */}
        <div className="bg-white border border-[#E7E2D8] rounded-lg p-5 shadow-sm mb-8 flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Describe your situation or scheme (e.g. farmer loan, rural house, girl child savings, elderly pension)..."
            className="flex-1 border border-[#E7E2D8] rounded-md px-4 py-3 text-sm text-[#1E2430] placeholder-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#2F6B5C]"
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={isLoading || !query.trim()}
            className="px-6 py-3 bg-[#2F6B5C] hover:bg-[#25574a] text-white font-medium rounded-md text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Discover Schemes</span>}
          </button>
        </div>

        {/* Loading status */}
        {isLoading && (
          <div className="bg-[#F4F1EA] border border-[#E7E2D8] rounded-md p-4 mb-6 flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-[#2F6B5C]" />
            <p className="text-sm text-[#1E2430] font-medium">{currentStepMessage}</p>
          </div>
        )}

        {/* Results */}
        {schemes.length > 0 && activeScheme && (
          <div className="space-y-6">
            {/* Multi-scheme navigation pills */}
            <div className="bg-white border border-[#E7E2D8] rounded-lg p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Layers className="w-4 h-4 text-[#2F6B5C]" />
                <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                  Found {schemes.length} Matching Schemes:
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {schemes.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedSchemeIndex(idx)}
                    className={`px-3.5 py-2 rounded-pill text-xs font-medium transition-colors border ${
                      selectedSchemeIndex === idx
                        ? 'bg-[#2F6B5C] text-white border-[#2F6B5C] shadow-sm'
                        : 'bg-[#FBF9F5] text-[#4B5563] border-[#E7E2D8] hover:border-[#2F6B5C] hover:text-[#1E2430]'
                    }`}
                  >
                    <span>{s.scheme_name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Active Scheme Detailed Card */}
            <div className="bg-white border border-[#E7E2D8] rounded-lg p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E7E2D8] pb-4 mb-5">
                <div>
                  <span className="text-xs font-semibold text-[#2F6B5C] uppercase tracking-wider">
                    {activeScheme.category || "Official Government Scheme"}
                  </span>
                  <h2 className="font-serif text-2xl font-bold text-[#1E2430] mt-1">
                    {activeScheme.scheme_name}
                  </h2>
                </div>
                <a
                  href={activeScheme.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#2F6B5C] hover:underline font-medium flex items-center gap-1"
                >
                  <span>View on myScheme.gov.in</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Status summary */}
              <div className="p-4 rounded-md mb-6 flex items-center gap-3 bg-[#F4F1EA] border border-[#E7E2D8]">
                {hasNotMet ? (
                  <>
                    <XCircle className="w-6 h-6 text-[#8E3326] shrink-0" />
                    <div>
                      <h4 className="text-sm font-semibold text-[#8E3326]">May not meet criteria</h4>
                      <p className="text-xs text-[#4B5563]">Based on your selection, one or more official requirements are not met.</p>
                    </div>
                  </>
                ) : allMet ? (
                  <>
                    <CheckCircle2 className="w-6 h-6 text-[#2B5C42] shrink-0" />
                    <div>
                      <h4 className="text-sm font-semibold text-[#2B5C42]">You appear eligible</h4>
                      <p className="text-xs text-[#4B5563]">All extracted criteria match your profile according to official lines.</p>
                    </div>
                  </>
                ) : (
                  <>
                    <HelpCircle className="w-6 h-6 text-[#7A5413] shrink-0" />
                    <div>
                      <h4 className="text-sm font-semibold text-[#7A5413]">
                        Check your eligibility ({answeredCount} of {totalCriteria} checked)
                      </h4>
                      <p className="text-xs text-[#4B5563]">Click 'Yes' or 'No' on each condition below to verify your eligibility.</p>
                    </div>
                  </>
                )}
              </div>

              {/* Criteria List */}
              <h3 className="font-medium text-sm text-[#1E2430] mb-3">Eligibility Requirements:</h3>
              <div className="space-y-3 mb-6">
                {activeScheme.criteria?.map((c: any, idx: number) => {
                  const state = activeAnswers[idx];
                  return (
                    <div 
                      key={idx}
                      className={`p-4 rounded-md border text-xs transition-colors ${
                        state === 'met'
                          ? 'border-[#2B5C42] bg-[#E6F0E9]'
                          : state === 'not_met'
                          ? 'border-[#8E3326] bg-[#F7E4E0]'
                          : 'border-[#E7E2D8] bg-[#FBF9F5]'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <p className="text-[#1E2430] font-medium leading-relaxed">
                          {c.criterion}
                        </p>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleSelectAnswer(idx, 'met')}
                            className={`px-3 py-1 rounded-pill font-medium text-xs transition-colors ${
                              state === 'met' 
                                ? 'bg-[#2B5C42] text-white' 
                                : 'bg-white border border-[#E7E2D8] text-[#4B5563] hover:text-[#1E2430]'
                            }`}
                          >
                            Yes / Met
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSelectAnswer(idx, 'not_met')}
                            className={`px-3 py-1 rounded-pill font-medium text-xs transition-colors ${
                              state === 'not_met' 
                                ? 'bg-[#8E3326] text-white' 
                                : 'bg-white border border-[#E7E2D8] text-[#4B5563] hover:text-[#1E2430]'
                            }`}
                          >
                            No / Not met
                          </button>
                        </div>
                      </div>
                      {c.source_span && (
                        <p className="text-[11px] text-[#6B7280] italic mt-2 border-t border-[#E7E2D8] pt-1.5">
                          Official wording: "{c.source_span}"
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Documents Needed */}
              {activeScheme.documents && activeScheme.documents.length > 0 && (
                <div className="mb-6 pt-4 border-t border-[#E7E2D8]">
                  <h3 className="font-medium text-sm text-[#1E2430] mb-2 flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-[#2F6B5C]" />
                    <span>Documents Required:</span>
                  </h3>
                  <ul className="list-disc list-inside text-xs text-[#4B5563] space-y-1">
                    {activeScheme.documents.map((doc: string, dIdx: number) => (
                      <li key={dIdx}>{doc}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Application steps */}
              {activeScheme.apply_steps && activeScheme.apply_steps.length > 0 && (
                <div className="mb-4 pt-4 border-t border-[#E7E2D8]">
                  <h3 className="font-medium text-sm text-[#1E2430] mb-2">How to Apply:</h3>
                  <ol className="list-decimal list-inside text-xs text-[#4B5563] space-y-1">
                    {activeScheme.apply_steps.map((st: string, sIdx: number) => (
                      <li key={sIdx}>{st}</li>
                    ))}
                  </ol>
                </div>
              )}

              <p className="text-[11px] text-[#6B7280] italic pt-3 border-t border-[#E7E2D8]">
                {activeScheme.disclaimer}
              </p>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

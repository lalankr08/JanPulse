'use client';

import React, { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { Shield, Database, Lock, AlertCircle, FileText, CheckCircle2, Sparkles, Building2 } from 'lucide-react';

export default function AboutPage() {
  const [language, setLanguage] = useState('en');

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F]">
      <Navbar language={language} setLanguage={setLanguage} />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="text-center max-w-xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0071E3]/10 text-[#0071E3] text-xs font-semibold mb-4 tracking-tight">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Architecture, Sources & Ethics</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1D1D1F] tracking-tight leading-tight mb-3">
            About Jan-Pulse & Official Verification
          </h1>
          <p className="text-[#6E6E73] text-sm sm:text-base leading-relaxed">
            An independent civic intelligence engine built for Indian citizens to verify claims, explore public schemes, and understand legal notifications against live official records.
          </p>
        </div>

        {/* Section 1: Official Sources */}
        <div className="bg-white border border-black/[0.06] rounded-3xl p-6 sm:p-8 mb-6 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
          <h2 className="text-lg font-bold text-[#1D1D1F] mb-4 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#0071E3]/10 text-[#0071E3] flex items-center justify-center">
              <Database className="w-4 h-4 stroke-[2]" />
            </div>
            <span>Official Government Sources Tracked</span>
          </h2>
          <div className="space-y-3.5 text-xs text-[#6E6E73]">
            <div className="p-4 bg-[#F5F5F7] border border-black/[0.04] rounded-2xl">
              <h3 className="font-semibold text-sm text-[#1D1D1F] mb-1">Press Information Bureau (PIB)</h3>
              <p className="leading-relaxed">Live RSS feeds and press release pages from pib.gov.in (English & Hindi) for policy announcements, cabinet decisions, and official notifications.</p>
            </div>
            <div className="p-4 bg-[#F5F5F7] border border-black/[0.04] rounded-2xl">
              <h3 className="font-semibold text-sm text-[#1D1D1F] mb-1">myScheme Portal (MeitY & Digital India)</h3>
              <p className="leading-relaxed">Structured scheme benefits, eligibility criteria, and required documents from myscheme.gov.in covering central and state beneficiary schemes.</p>
            </div>
            <div className="p-4 bg-[#F5F5F7] border border-black/[0.04] rounded-2xl">
              <h3 className="font-semibold text-sm text-[#1D1D1F] mb-1">The Gazette of India (e-Gazette) & India Code</h3>
              <p className="leading-relaxed">Official legal notifications, central acts, and statutory rules from egazette.gov.in and indiacode.nic.in.</p>
            </div>
            <div className="p-4 bg-[#F5F5F7] border border-black/[0.04] rounded-2xl">
              <h3 className="font-semibold text-sm text-[#1D1D1F] mb-1">Open Government Data (data.gov.in)</h3>
              <p className="leading-relaxed">Official statistical datasets for numeric and quantitative claim checks.</p>
            </div>
          </div>
        </div>

        {/* Section 2: Zero Dummy Data Guarantee */}
        <div className="bg-white border border-black/[0.06] rounded-3xl p-6 sm:p-8 mb-6 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
          <h2 className="text-lg font-bold text-[#1D1D1F] mb-3 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#34C759]/15 text-[#248A3D] flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 stroke-[2]" />
            </div>
            <span>Zero Dummy Data Guarantee</span>
          </h2>
          <p className="text-xs sm:text-sm text-[#6E6E73] leading-relaxed mb-3">
            Every statement and citation displayed on Jan-Pulse originates from live, runtime fetches from official government domains (.gov.in / .nic.in). No mock databases, pre-cooked answers, or hallucinated claims are ever served.
          </p>
          <p className="text-xs text-[#86868B] leading-relaxed">
            Every single citation carries an exact fetch timestamp, the official publisher, and the full URL so any citizen or journalist can independently verify the source on official portals.
          </p>
        </div>

        {/* Section 3: Privacy & Ethics */}
        <div id="privacy" className="bg-white border border-black/[0.06] rounded-3xl p-6 sm:p-8 mb-6 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
          <h2 className="text-lg font-bold text-[#1D1D1F] mb-3 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#0071E3]/10 text-[#0071E3] flex items-center justify-center">
              <Lock className="w-4 h-4 stroke-[2]" />
            </div>
            <span>Privacy, Consent, & Data Minimization</span>
          </h2>
          <ul className="list-disc list-inside text-xs sm:text-sm text-[#6E6E73] space-y-2 leading-relaxed">
            <li><strong>Minimal collection:</strong> We never ask for Aadhaar numbers, phone numbers, bank accounts, or home addresses.</li>
            <li><strong>Model processing:</strong> Uploaded screenshots and audio clips are processed using AI models (Groq and Google Gemini) strictly for optical character recognition and transcription.</li>
            <li><strong>Ephemeral storage:</strong> Uploads are kept in private temporary storage and can be deleted at any time from your Account page.</li>
            <li><strong>No tracking:</strong> No advertising trackers, cookies, or personal profiling scripts are used.</li>
          </ul>
        </div>

        {/* Section 4: Unofficial Disclaimer */}
        <div className="bg-[#FF9500]/10 border border-[#FF9500]/20 rounded-3xl p-6 sm:p-7">
          <div className="flex items-start gap-3.5">
            <div className="w-8 h-8 rounded-xl bg-[#FF9500]/15 text-[#B25000] flex items-center justify-center shrink-0">
              <AlertCircle className="w-4 h-4 stroke-[2]" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#B25000] mb-1">
                Advisory Notice & Disclaimer
              </h3>
              <p className="text-xs text-[#B25000]/90 leading-relaxed">
                Jan-Pulse is an independent, unofficial civic information engine built for public transparency. It does not represent or act on behalf of the Government of India or any state government. The results and eligibility assessments are advisory guidance based on published text, not official or legal decisions. For formal applications, always consult the official portal or your local Common Service Centre (CSC).
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

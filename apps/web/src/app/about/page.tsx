'use client';

import React, { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { Shield, Database, Lock, AlertCircle, FileText, CheckCircle2 } from 'lucide-react';

export default function AboutPage() {
  const [language, setLanguage] = useState('en');

  return (
    <>
      <Navbar language={language} setLanguage={setLanguage} />

      <main className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="font-serif text-3xl font-bold text-[#1E2430] mb-3">
          About Jan-Pulse, Sources, & Privacy
        </h1>
        <p className="text-sm text-[#4B5563] leading-relaxed mb-8">
          Jan-Pulse is an open-source civic intelligence platform designed for Indian citizens to verify claims, explore public scheme eligibility, and understand legal notifications against live official government records.
        </p>

        {/* Section 1: Official Sources */}
        <div className="bg-white border border-[#E7E2D8] rounded-lg p-6 mb-8 shadow-sm">
          <h2 className="font-serif text-xl font-bold text-[#1E2430] mb-3 flex items-center gap-2">
            <Database className="w-5 h-5 text-[#2F6B5C]" />
            <span>Official Government Sources Tracked</span>
          </h2>
          <div className="space-y-4 text-xs text-[#4B5563] leading-relaxed">
            <div className="p-3 bg-[#FBF9F5] border border-[#E7E2D8] rounded-md">
              <h3 className="font-semibold text-sm text-[#1E2430] mb-1">Press Information Bureau (PIB)</h3>
              <p>Live RSS feeds and press release pages from pib.gov.in (English & Hindi) for policy announcements, cabinet decisions, and official notifications.</p>
            </div>
            <div className="p-3 bg-[#FBF9F5] border border-[#E7E2D8] rounded-md">
              <h3 className="font-semibold text-sm text-[#1E2430] mb-1">myScheme Portal (MeitY & Digital India)</h3>
              <p>Structured scheme benefits, eligibility criteria, and required documents from myscheme.gov.in covering central and state beneficiary schemes.</p>
            </div>
            <div className="p-3 bg-[#FBF9F5] border border-[#E7E2D8] rounded-md">
              <h3 className="font-semibold text-sm text-[#1E2430] mb-1">The Gazette of India (e-Gazette) & India Code</h3>
              <p>Official legal notifications, central acts, and statutory rules from egazette.gov.in and indiacode.nic.in.</p>
            </div>
            <div className="p-3 bg-[#FBF9F5] border border-[#E7E2D8] rounded-md">
              <h3 className="font-semibold text-sm text-[#1E2430] mb-1">Open Government Data (data.gov.in)</h3>
              <p>Official statistical datasets for numeric and quantitative claim checks.</p>
            </div>
          </div>
        </div>

        {/* Section 2: Zero Dummy Data Guarantee */}
        <div className="bg-white border border-[#E7E2D8] rounded-lg p-6 mb-8 shadow-sm">
          <h2 className="font-serif text-xl font-bold text-[#1E2430] mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[#2F6B5C]" />
            <span>Zero Dummy Data Guarantee</span>
          </h2>
          <p className="text-xs text-[#4B5563] leading-relaxed mb-3">
            Every statement and citation displayed on Jan-Pulse originates from live, runtime fetches from official government domains (.gov.in / .nic.in). No mock databases, pre-cooked answers, or hallucinated claims are ever served.
          </p>
          <p className="text-xs text-[#4B5563] leading-relaxed">
            Every single citation carries an exact fetch timestamp, the official publisher, and the full URL so any citizen or journalist can independently verify the source on official portals.
          </p>
        </div>

        {/* Section 3: Privacy & Ethics */}
        <div id="privacy" className="bg-white border border-[#E7E2D8] rounded-lg p-6 mb-8 shadow-sm">
          <h2 className="font-serif text-xl font-bold text-[#1E2430] mb-3 flex items-center gap-2">
            <Lock className="w-5 h-5 text-[#2F6B5C]" />
            <span>Privacy, Consent, & Data Minimization</span>
          </h2>
          <ul className="list-disc list-inside text-xs text-[#4B5563] space-y-2 leading-relaxed">
            <li><strong>Minimal collection:</strong> We never ask for Aadhaar numbers, phone numbers, bank accounts, or home addresses.</li>
            <li><strong>Model processing:</strong> Uploaded screenshots and audio clips are processed using AI models (Groq and Google Gemini) strictly for optical character recognition and transcription.</li>
            <li><strong>Ephemeral storage:</strong> Uploads are kept in private temporary storage and can be deleted at any time from your Account page.</li>
            <li><strong>No tracking:</strong> No advertising trackers, cookies, or personal profiling scripts are used.</li>
          </ul>
        </div>

        {/* Section 4: Unofficial Disclaimer */}
        <div className="bg-[#F4F1EA] border border-[#E7E2D8] rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-[#C9643B] shrink-0 mt-0.5" />
            <div>
              <h3 className="font-serif font-bold text-sm text-[#1E2430] mb-1">
                Important Disclaimer
              </h3>
              <p className="text-xs text-[#4B5563] leading-relaxed">
                Jan-Pulse is an independent, unofficial civic information engine built for public transparency. It does not represent or act on behalf of the Government of India or any state government. The results and eligibility assessments are advisory guidance based on published text, not official or legal decisions. For formal applications, always consult the official portal or your local Common Service Centre (CSC).
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}


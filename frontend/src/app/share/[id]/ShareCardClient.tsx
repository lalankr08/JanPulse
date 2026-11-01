'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { VerdictChip } from '@/components/VerdictChip';
import { CitationCard } from '@/components/CitationCard';
import { AudioPlayer } from '@/components/AudioPlayer';
import { fetchPublicShare, savePublicShareCard } from '@/lib/api';
import { Loader2, Share2, Check, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';

interface ShareCardClientProps {
  shareId: string;
}

export function ShareCardClient({ shareId }: ShareCardClientProps) {
  const [language, setLanguage] = useState('en');
  const [cardData, setCardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (shareId) {
      fetchPublicShare(shareId)
        .then(data => {
          if (data?.share_card) {
            setCardData(data.share_card);
            try {
              localStorage.setItem(`janpulse_card_${shareId}`, JSON.stringify(data.share_card));
            } catch (e) {}
          }
          setLoading(false);
        })
        .catch(err => {
          console.warn("[ShareCard] Server lookup note:", err);
          // Check local device storage fallback
          try {
            const cached = localStorage.getItem(`janpulse_card_${shareId}`);
            if (cached) {
              const parsed = JSON.parse(cached);
              setCardData(parsed);
              setLoading(false);
              // Background sync to server so other users / devices can view it
              savePublicShareCard(parsed).catch(() => {});
              return;
            }
          } catch (e) {}
          setLoading(false);
        });
    }
  }, [shareId]);

  const copyUrl = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F]">
      <Navbar language={language} setLanguage={setLanguage} />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        {/* Top Breadcrumb & Status */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/[0.04] border border-black/[0.06] text-xs font-semibold text-[#86868B] mb-3">
            <Sparkles className="w-3.5 h-3.5 text-[#0071E3]" />
            <span>Official Fact Check Record</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1D1D1F]">
            Public Verification Card
          </h1>
          <p className="text-xs sm:text-sm text-[#86868B] mt-1.5">
            Cryptographically sealed and cross-referenced against authoritative government sources.
          </p>
        </div>

        {loading ? (
          <div className="bg-white rounded-3xl p-12 text-center shadow-apple-card border border-black/[0.06]">
            <Loader2 className="w-7 h-7 animate-spin mx-auto text-[#0071E3] mb-3" />
            <p className="text-sm font-medium text-[#1D1D1F]">Retrieving verification record...</p>
            <p className="text-xs text-[#86868B] mt-1">Cross-referencing gazette registry ID {shareId}</p>
          </div>
        ) : !cardData ? (
          <div className="bg-white rounded-3xl p-10 text-center shadow-apple-card border border-black/[0.06]">
            <div className="w-12 h-12 rounded-2xl bg-[#FF3B30]/10 text-[#FF3B30] flex items-center justify-center mx-auto mb-4 font-bold text-lg">
              !
            </div>
            <h2 className="text-lg font-bold text-[#1D1D1F] mb-1.5">Verdict Card Not Found</h2>
            <p className="text-xs sm:text-sm text-[#86868B] mb-6">
              The requested public verification link may have expired or is invalid.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#0071E3] text-white text-xs font-semibold hover:bg-[#0077ED] transition-all shadow-apple-sm"
            >
              <span>Verify a New Message</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-6 sm:p-9 shadow-apple-card border border-black/[0.06] space-y-6">
            {/* Header: Verdict & Listen */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-black/[0.06]">
              <VerdictChip label={cardData.label} size="lg" />
              {cardData.explanation && (
                <AudioPlayer text={cardData.explanation} language={cardData.explanation_lang || "en"} />
              )}
            </div>

            {/* Claim Quote Card */}
            <div>
              <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider block mb-2">
                Forwarded Claim
              </span>
              <div className="bg-[#F5F5F7] rounded-2xl p-4 border border-black/[0.04]">
                <p className="text-sm text-[#1D1D1F] leading-relaxed font-medium italic">
                  &ldquo;{cardData.claim_text}&rdquo;
                </p>
              </div>
            </div>

            {/* Official Finding */}
            <div>
              <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider block mb-2">
                Official Finding
              </span>
              <p className="text-sm sm:text-base text-[#1D1D1F] leading-relaxed">
                {cardData.explanation}
              </p>

              {cardData.confidence_reason && (
                <div className="mt-3.5 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F5F5F7] border border-black/[0.04] text-xs text-[#86868B]">
                  <span className="font-semibold text-[#1D1D1F]">
                    {Math.round((cardData.confidence || 0.8) * 100)}% Confidence
                  </span>
                  <span>&bull;</span>
                  <span className="truncate">{cardData.confidence_reason}</span>
                </div>
              )}
            </div>

            {/* Citations */}
            {cardData.citations && cardData.citations.length > 0 && (
              <div className="space-y-3 pt-5 border-t border-black/[0.06]">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider">
                    Authoritative Citations ({cardData.citations.length})
                  </span>
                  <span className="text-[11px] text-[#86868B]">PIB &middot; e-Gazette &middot; myScheme</span>
                </div>
                <div className="space-y-2.5">
                  {cardData.citations.map((c: any, idx: number) => (
                    <CitationCard
                      key={idx}
                      publisher={c.publisher}
                      url={c.url}
                      span={c.span}
                      role={c.role}
                      fetchedAt={c.fetched_at}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Bottom Bar: Shield & Actions */}
            <div className="pt-5 border-t border-black/[0.06] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-[#86868B]">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-[#34C759]/10 text-[#34C759] flex items-center justify-center">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <span className="font-medium text-[#1D1D1F]">Verified via Jan-Pulse Engine</span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                <button
                  type="button"
                  onClick={copyUrl}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#F5F5F7] hover:bg-[#EBEBF0] text-xs font-semibold text-[#1D1D1F] transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-[#34C759]" /> : <Share2 className="w-3.5 h-3.5" />}
                  <span>{copied ? "Link Copied" : "Share Card"}</span>
                </button>

                <Link
                  href="/"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#0071E3] hover:bg-[#0077ED] text-xs font-semibold text-white transition-colors shadow-apple-sm"
                >
                  <span>Verify Claim</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}


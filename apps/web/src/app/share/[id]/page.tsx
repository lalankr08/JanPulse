'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { VerdictChip } from '@/components/VerdictChip';
import { CitationCard } from '@/components/CitationCard';
import { AudioPlayer } from '@/components/AudioPlayer';
import { fetchPublicShare } from '@/lib/api';
import { Loader2, Share2, Check, ShieldCheck } from 'lucide-react';

export default function ShareCardPage() {
  const params = useParams();
  const shareId = params?.id as string;
  const [language, setLanguage] = useState('en');
  const [cardData, setCardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (shareId) {
      fetchPublicShare(shareId)
        .then(data => {
          setCardData(data.share_card);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
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
    <>
      <Navbar language={language} setLanguage={setLanguage} />

      <main className="max-w-2xl mx-auto px-4 py-12">
        {loading ? (
          <div className="text-center py-20">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#2F6B5C] mb-2" />
            <p className="text-xs text-[#6B7280]">Loading public verdict card...</p>
          </div>
        ) : !cardData ? (
          <div className="bg-white border border-[#E7E2D8] rounded-md p-8 text-center">
            <h2 className="font-serif text-lg font-bold text-[#1E2430] mb-2">Verdict Card Not Found</h2>
            <p className="text-xs text-[#4B5563]">The requested link may have expired or is invalid.</p>
          </div>
        ) : (
          <div className="bg-white border border-[#E7E2D8] rounded-lg p-6 sm:p-8 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-6">
              <VerdictChip label={cardData.label} size="lg" />
              {cardData.explanation && (
                <AudioPlayer text={cardData.explanation} language={cardData.explanation_lang || "en"} />
              )}
            </div>

            <div className="mb-5">
              <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider block mb-1">
                Forward Claim:
              </span>
              <p className="text-sm text-[#1E2430] font-medium bg-[#FBF9F5] p-3.5 rounded-md border border-[#E7E2D8]">
                "{cardData.claim_text}"
              </p>
            </div>

            <div className="mb-6">
              <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider block mb-1">
                Official Finding:
              </span>
              <p className="text-base text-[#1E2430] leading-relaxed">
                {cardData.explanation}
              </p>
              {cardData.confidence_reason && (
                <p className="text-xs text-[#6B7280] mt-2 italic">
                  Confidence: {Math.round((cardData.confidence || 0.8) * 100)}% — {cardData.confidence_reason}
                </p>
              )}
            </div>

            {cardData.citations && cardData.citations.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-[#E7E2D8] mb-6">
                <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider block">
                  Official Evidence Citations:
                </span>
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
            )}

            <div className="pt-4 border-t border-[#E7E2D8] flex items-center justify-between text-xs text-[#6B7280]">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#2F6B5C]" />
                <span>Verified via Jan-Pulse Public Engine</span>
              </span>

              <button
                type="button"
                onClick={copyUrl}
                className="text-[#2F6B5C] hover:text-[#25574a] font-medium flex items-center gap-1"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied" : "Copy card link"}</span>
              </button>
            </div>
          </div>
        )}
      </main>
    </>
  );
}


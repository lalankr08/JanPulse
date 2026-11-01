import React from 'react';
import { ExternalLink, Building2, Clock, CheckCircle } from 'lucide-react';

interface CitationCardProps {
  publisher: string;
  url: string;
  span: string;
  role?: string;
  fetchedAt?: string;
}

export const CitationCard: React.FC<CitationCardProps> = ({
  publisher,
  url,
  span,
  role = "supports",
  fetchedAt
}) => {
  const formattedTime = fetchedAt 
    ? new Date(fetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })
    : "Verified live";

  let cleanUrl = url || "https://factcheck.pib.gov.in";
  if (cleanUrl.includes("pib.gov.in/factcheck")) {
    cleanUrl = "https://factcheck.pib.gov.in";
  } else if (cleanUrl.includes("pib.gov.in/search")) {
    cleanUrl = "https://www.pib.gov.in/allRel.aspx";
  }

  return (
    <div className="bg-[#F5F5F7] border border-black/[0.06] rounded-2xl p-4 text-[#1D1D1F] flex flex-col gap-2.5 transition-all hover:bg-[#EBEBF0] hover:border-black/[0.1]">
      <div className="flex items-center justify-between text-xs text-[#86868B]">
        <div className="flex items-center gap-1.5 font-medium text-[#1D1D1F]">
          <Building2 className="w-3.5 h-3.5 text-[#0071E3] shrink-0" strokeWidth={1.8} />
          <span className="truncate max-w-[200px] sm:max-w-xs">{publisher || "Official Government Portal"}</span>
        </div>
        <div className="flex items-center gap-1 text-[11px] font-mono text-[#86868B] shrink-0">
          <Clock className="w-3 h-3" />
          <span>{formattedTime}</span>
        </div>
      </div>

      <blockquote className="text-[13px] text-[#1D1D1F] bg-white rounded-xl p-3 border border-black/[0.04] leading-relaxed shadow-sm font-normal">
        "{span}"
      </blockquote>

      <div className="pt-0.5 flex items-center justify-between text-xs">
        <a
          href={cleanUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#0071E3] hover:text-[#0077ED] flex items-center gap-1 font-semibold group transition-colors"
        >
          <span>Open official source</span>
          <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </a>
        <span className="text-[11px] font-medium text-[#86868B] bg-black/[0.04] px-2 py-0.5 rounded-full capitalize">
          {role}
        </span>
      </div>
    </div>
  );
};

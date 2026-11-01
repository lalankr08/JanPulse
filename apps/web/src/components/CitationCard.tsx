import React from 'react';
import { ExternalLink, Building2, Clock } from 'lucide-react';

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
    : "Just now";

  // Sanitize and normalize known dead links
  let cleanUrl = url || "https://factcheck.pib.gov.in";
  if (cleanUrl.includes("pib.gov.in/factcheck")) {
    cleanUrl = "https://factcheck.pib.gov.in";
  } else if (cleanUrl.includes("pib.gov.in/search")) {
    cleanUrl = "https://www.pib.gov.in/allRel.aspx";
  }

  return (
    <div className="bg-[#F4F1EA] border border-[#E7E2D8] rounded-md p-4 text-[#1E2430] flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs text-[#6B7280]">
        <div className="flex items-center gap-1.5 font-medium text-[#4B5563]">
          <Building2 className="w-3.5 h-3.5" strokeWidth={1.5} />
          <span>{publisher || "Official Government Portal"}</span>
        </div>
        <div className="flex items-center gap-1 text-[11px]">
          <Clock className="w-3 h-3" />
          <span>Fetched {formattedTime}</span>
        </div>
      </div>

      <blockquote className="text-sm italic text-[#1E2430] border-l-2 border-[#2F6B5C] pl-3 py-0.5 leading-relaxed my-1">
        "{span}"
      </blockquote>

      <div className="pt-1 flex items-center justify-between text-xs">
        <a
          href={cleanUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#2F6B5C] hover:underline flex items-center gap-1 font-medium"
        >
          <span>View official source</span>
          <ExternalLink className="w-3 h-3" />
        </a>
        <span className="text-[11px] text-[#6B7280] uppercase tracking-wider">
          Role: {role}
        </span>
      </div>
    </div>
  );
};


import React, { useState } from 'react';
import { Check, X, ChevronDown, ChevronUp, Clock, Database, Globe, Cpu } from 'lucide-react';

export interface TraceStep {
  seq: number;
  node: string;
  eventType: string;
  tool?: string;
  url?: string;
  model?: string;
  httpStatus?: number;
  latencyMs?: number;
  detail?: any;
}

interface EvidenceTrailProps {
  steps: TraceStep[];
}

export const EvidenceTrail: React.FC<EvidenceTrailProps> = ({ steps }) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="bg-white border border-[#E7E2D8] rounded-md p-5 text-[#1E2430]">
      <div 
        className="flex items-center justify-between cursor-pointer select-none pb-2 border-b border-[#E7E2D8]"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-[#2F6B5C]" strokeWidth={2} />
          <h3 className="font-medium text-sm text-[#1E2430]">Evidence Trail and Verification Log</h3>
          <span className="text-xs bg-[#F4F1EA] text-[#4B5563] px-2 py-0.5 rounded-full font-mono">
            {steps.length} {steps.length === 1 ? 'event' : 'events'}
          </span>
        </div>
        <button 
          type="button" 
          className="text-[#6B7280] hover:text-[#1E2430] p-1"
          aria-label={isOpen ? "Collapse evidence trail" : "Expand evidence trail"}
        >
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {isOpen && (
        <div className="mt-4 space-y-3">
          {steps.length === 0 ? (
            <p className="text-xs text-[#6B7280] italic">Running pipeline steps...</p>
          ) : (
            <ol className="divide-y divide-[#F4F1EA]">
              {steps.map((st, idx) => {
                const isSuccess = !st.httpStatus || st.httpStatus < 400;
                return (
                  <li key={idx} className="py-2.5 flex items-start gap-3 text-xs">
                    <div className="mt-0.5">
                      {isSuccess ? (
                        <div className="w-4 h-4 rounded-full bg-[#E6F0E9] text-[#2B5C42] flex items-center justify-center">
                          <Check className="w-3 h-3" strokeWidth={2.5} />
                        </div>
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-[#F7E4E0] text-[#8E3326] flex items-center justify-center">
                          <X className="w-3 h-3" strokeWidth={2.5} />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-[#1E2430] capitalize">
                          {st.node.replace('_', ' ')}
                        </span>
                        {st.latencyMs !== undefined && (
                          <span className="text-[11px] text-[#6B7280] flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3" />
                            {st.latencyMs}ms
                          </span>
                        )}
                      </div>

                      {st.tool && (
                        <p className="text-[#4B5563] text-[11px] mt-0.5 font-mono">
                          Tool: <span className="text-[#2F6B5C] font-semibold">{st.tool}</span>
                        </p>
                      )}

                      {st.url && (
                        <p className="text-[#6B7280] text-[11px] truncate mt-0.5" title={st.url}>
                          {st.url}
                        </p>
                      )}

                      {st.model && (
                        <p className="text-[#6B7280] text-[11px] flex items-center gap-1 mt-0.5 font-mono">
                          <Cpu className="w-3 h-3" />
                          <span>{st.model}</span>
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      )}
    </div>
  );
};


'use client';

import React, { useState } from 'react';
import { Check, X, ChevronDown, ChevronUp, Clock, Globe, Cpu, Activity } from 'lucide-react';

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
    <div className="bg-white border border-black/[0.06] rounded-3xl p-5 sm:p-6 shadow-sm">
      <div 
        className="flex items-center justify-between cursor-pointer select-none pb-3 border-b border-black/[0.06]"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#0071E3]/10 text-[#0071E3] flex items-center justify-center">
            <Activity className="w-4 h-4 stroke-[2]" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-[#1D1D1F] tracking-tight">Evidence Trail</h3>
            <p className="text-[11px] text-[#86868B]">Real-time query execution & latency log</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono font-medium bg-black/[0.04] text-[#1D1D1F] px-2.5 py-0.5 rounded-full">
            {steps.length} {steps.length === 1 ? 'event' : 'events'}
          </span>
          <button 
            type="button" 
            className="text-[#86868B] hover:text-[#1D1D1F] p-1 rounded-full hover:bg-black/[0.04] transition-colors"
            aria-label={isOpen ? "Collapse trail" : "Expand trail"}
          >
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="mt-4 space-y-2">
          {steps.length === 0 ? (
            <div className="py-6 text-center text-xs text-[#86868B] flex flex-col items-center gap-2">
              <Globe className="w-5 h-5 text-[#86868B]/60 animate-pulse" />
              <span>Awaiting query execution...</span>
            </div>
          ) : (
            <ol className="divide-y divide-black/[0.04]">
              {steps.map((st, idx) => {
                const isSuccess = !st.httpStatus || st.httpStatus < 400;
                return (
                  <li key={idx} className="py-2.5 flex items-start gap-3 text-xs first:pt-1 last:pb-1">
                    <div className="mt-0.5 shrink-0">
                      {isSuccess ? (
                        <div className="w-4 h-4 rounded-full bg-[#34C759]/15 text-[#248A3D] flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-[#FF3B30]/15 text-[#FF3B30] flex items-center justify-center">
                          <X className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-[#1D1D1F] capitalize tracking-tight">
                          {st.node.replace('_', ' ')}
                        </span>
                        {st.latencyMs !== undefined && (
                          <span className="text-[10px] text-[#86868B] flex items-center gap-1 font-mono bg-black/[0.03] px-2 py-0.5 rounded-full">
                            <Clock className="w-2.5 h-2.5" />
                            {st.latencyMs}ms
                          </span>
                        )}
                      </div>

                      {st.tool && (
                        <p className="text-[#6E6E73] text-[11px] mt-0.5">
                          Tool: <span className="text-[#0071E3] font-medium">{st.tool}</span>
                        </p>
                      )}

                      {st.url && (
                        <p className="text-[#86868B] text-[11px] font-mono truncate mt-0.5 hover:text-[#1D1D1F] transition-colors" title={st.url}>
                          {st.url}
                        </p>
                      )}

                      {st.model && (
                        <p className="text-[#86868B] text-[10px] flex items-center gap-1 mt-0.5 font-mono">
                          <Cpu className="w-3 h-3 text-[#0071E3]" />
                          <span>{st.model}</span>
                        </p>
                      )}

                      {st.detail && typeof st.detail === 'string' && (
                        <p className="text-[#86868B] text-[11px] mt-0.5 italic">
                          {st.detail}
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

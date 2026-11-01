import React from 'react';
import { CheckCircle2, XCircle, AlertCircle, HelpCircle } from 'lucide-react';

interface VerdictChipProps {
  label: 'supported' | 'contradicted' | 'partly_supported' | 'cannot_verify' | string;
  size?: 'sm' | 'md' | 'lg';
}

export const VerdictChip: React.FC<VerdictChipProps> = ({ label, size = 'md' }) => {
  const normalized = (label || '').toLowerCase();

  let bgClass = "bg-[#8E8E93]/10 text-[#636366] border border-[#8E8E93]/20";
  let labelText = "Can't verify from official records";
  let Icon = HelpCircle;

  if (normalized === 'supported') {
    bgClass = "bg-[#34C759]/10 text-[#248A3D] border border-[#34C759]/25";
    labelText = "Supported by official source";
    Icon = CheckCircle2;
  } else if (normalized === 'contradicted') {
    bgClass = "bg-[#FF3B30]/10 text-[#D70015] border border-[#FF3B30]/25";
    labelText = "Contradicted by official source";
    Icon = XCircle;
  } else if (normalized === 'partly_supported') {
    bgClass = "bg-[#FF9500]/10 text-[#B25000] border border-[#FF9500]/25";
    labelText = "Partly supported by records";
    Icon = AlertCircle;
  }

  const sizeClasses = size === 'sm' 
    ? "px-3 py-1 text-xs gap-1.5"
    : size === 'lg'
    ? "px-4 py-2 text-sm sm:text-base gap-2 font-semibold"
    : "px-3.5 py-1.5 text-xs sm:text-sm gap-2 font-medium";

  return (
    <span className={`inline-flex items-center rounded-full tracking-tight transition-all ${bgClass} ${sizeClasses}`}>
      <Icon className={size === 'sm' ? "w-3.5 h-3.5" : "w-4 h-4 shrink-0"} strokeWidth={2.2} />
      <span>{labelText}</span>
    </span>
  );
};

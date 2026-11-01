import React from 'react';
import { CheckCircle2, XCircle, AlertCircle, HelpCircle } from 'lucide-react';

interface VerdictChipProps {
  label: 'supported' | 'contradicted' | 'partly_supported' | 'cannot_verify' | string;
  size?: 'sm' | 'md' | 'lg';
}

export const VerdictChip: React.FC<VerdictChipProps> = ({ label, size = 'md' }) => {
  const normalized = label.toLowerCase();

  let bgClass = "bg-[#E9EDF2] text-[#455064]";
  let labelText = "Can't verify";
  let Icon = HelpCircle;

  if (normalized === 'supported') {
    bgClass = "bg-[#E6F0E9] text-[#2B5C42]";
    labelText = "Supported by official source";
    Icon = CheckCircle2;
  } else if (normalized === 'contradicted') {
    bgClass = "bg-[#F7E4E0] text-[#8E3326]";
    labelText = "Contradicted by official source";
    Icon = XCircle;
  } else if (normalized === 'partly_supported') {
    bgClass = "bg-[#F6ECD3] text-[#7A5413]";
    labelText = "Partly supported";
    Icon = AlertCircle;
  }

  const sizeClasses = size === 'sm' 
    ? "px-2.5 py-1 text-xs gap-1.5"
    : size === 'lg'
    ? "px-4 py-2 text-base gap-2 font-medium"
    : "px-3.5 py-1.5 text-sm gap-2";

  return (
    <span className={`inline-flex items-center rounded-pill font-medium tracking-normal ${bgClass} ${sizeClasses}`}>
      <Icon className={size === 'sm' ? "w-3.5 h-3.5" : "w-4 h-4"} strokeWidth={2} />
      <span>{labelText}</span>
    </span>
  );
};


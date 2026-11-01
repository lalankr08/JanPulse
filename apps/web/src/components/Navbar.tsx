import React from 'react';
import Link from 'next/link';

interface NavbarProps {
  language: string;
  setLanguage: (lang: string) => void;
}

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'te', label: 'తెలుగు' },
  { code: 'bn', label: 'বাংলা' },
  { code: 'mr', label: 'मराठी' },
];

export const Navbar: React.FC<NavbarProps> = ({ language, setLanguage }) => {
  return (
    <header className="border-b border-[#E7E2D8] bg-white sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-6 h-6 rounded-md bg-[#2F6B5C] flex items-center justify-center text-white text-xs font-serif font-bold">
              J
            </div>
            <span className="font-serif text-xl font-bold text-[#1E2430] tracking-tight">
              Jan-Pulse
            </span>
          </Link>
          <span className="hidden sm:inline-block text-[11px] text-[#6B7280] bg-[#F4F1EA] px-2 py-0.5 rounded-sm border border-[#E7E2D8]">
            Unofficial Civic Record
          </span>
        </div>

        {/* Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm text-[#4B5563]">
          <Link href="/" className="hover:text-[#1E2430] transition-colors font-medium">
            Forward Checker
          </Link>
          <Link href="/schemes" className="hover:text-[#1E2430] transition-colors font-medium">
            Schemes Wizard
          </Link>
          <Link href="/explain" className="hover:text-[#1E2430] transition-colors font-medium">
            Notifications
          </Link>
          <Link href="/about" className="hover:text-[#1E2430] transition-colors font-medium">
            Sources & Ethics
          </Link>
          <Link href="/account" className="hover:text-[#1E2430] transition-colors font-medium">
            History
          </Link>
        </nav>

        {/* Language Switcher */}
        <div className="flex items-center gap-1 bg-[#F4F1EA] p-1 rounded-pill border border-[#E7E2D8]">
          {LANGUAGES.slice(0, 3).map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => setLanguage(l.code)}
              className={`px-2.5 py-1 text-xs rounded-pill transition-colors font-medium ${
                language === l.code
                  ? "bg-[#2F6B5C] text-white shadow-sm"
                  : "text-[#4B5563] hover:text-[#1E2430]"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
};


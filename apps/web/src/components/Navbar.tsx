'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldCheck, Menu, X, User, Lock, Cloud, LogOut, LogIn } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { setAuthPreference } from '@/lib/historyStore';
import { AuthModal } from '@/components/AuthModal';

interface NavbarProps {
  language: string;
  setLanguage: (lang: string) => void;
}

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
];

export const Navbar: React.FC<NavbarProps> = ({ language, setLanguage }) => {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const refreshUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    refreshUser();

    // Sync saved language from localStorage on mount
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('janpulse_language');
      if (saved && (saved === 'en' || saved === 'hi') && saved !== language) {
        setLanguage(saved);
      }
    }

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleLanguageChange = (code: string) => {
    setLanguage(code);
    if (typeof window !== 'undefined') {
      localStorage.setItem('janpulse_language', code);
      window.dispatchEvent(new CustomEvent('janpulse_language_changed', { detail: code }));
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setAuthPreference('guest');
    setUser(null);
  };

  const navLinks = [
    { href: '/', label: 'Forward Checker' },
    { href: '/schemes', label: 'Schemes' },
    { href: '/explain', label: 'Gazette Explainer' },
    { href: '/account', label: 'History & Privacy' },
    { href: '/about', label: 'Sources' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-white/80 border-b border-black/[0.06] transition-all">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group shrink-0">
          <div className="w-8 h-8 rounded-xl bg-[#0071E3] flex items-center justify-center text-white shadow-apple-sm transition-transform duration-200 group-hover:scale-105">
            <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
          </div>
          <span className="font-bold text-base tracking-tight text-[#1D1D1F]">
            Jan-Pulse
          </span>
        </Link>

        {/* Desktop Links */}
        <nav className="hidden md:flex items-center gap-1 bg-black/[0.03] p-1 rounded-full border border-black/[0.04]">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3.5 py-1.5 text-xs rounded-full transition-all duration-150 ${
                  isActive
                    ? 'bg-white text-[#1D1D1F] shadow-[0_1px_3px_rgba(0,0,0,0.08)] font-semibold'
                    : 'text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-white/50'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right side controls: English / Hindi Switcher + Auth + Mobile toggle */}
        <div className="flex items-center gap-2">
          {/* Segmented language capsule */}
          <div className="flex items-center bg-black/[0.04] p-0.5 rounded-full border border-black/[0.04]">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => handleLanguageChange(l.code)}
                className={`px-3 py-1 text-xs rounded-full transition-all ${
                  language === l.code
                    ? 'bg-white text-[#1D1D1F] font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.1)]'
                    : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>

          {/* Auth Capsule */}
          {user ? (
            <div className="hidden sm:flex items-center gap-1.5 pl-1">
              <Link
                href="/account"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full bg-[#34C759]/10 text-[#248A3D] border border-[#34C759]/20 hover:bg-[#34C759]/15 transition-all"
                title={`Logged in as ${user.email} (Saved to Account)`}
              >
                <Cloud className="w-3.5 h-3.5" />
                <span className="max-w-[100px] truncate">{user.email?.split('@')[0]}</span>
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="p-1.5 text-[#86868B] hover:text-[#FF3B30] rounded-full hover:bg-black/[0.04] transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-1.5 pl-1">
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-full bg-[#0071E3] text-white hover:bg-[#0077ED] shadow-apple-sm transition-all active:scale-95"
                title="Sign In or Create Account to save checks across devices"
              >
                <User className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            </div>
          )}

          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-[#1D1D1F] hover:bg-black/[0.05] transition-colors"
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-black/[0.06] bg-white/95 backdrop-blur-xl px-4 py-4 space-y-2 animate-fadeIn">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-[#0071E3]/10 text-[#0071E3] font-semibold'
                    : 'text-[#1D1D1F] hover:bg-black/[0.04]'
                }`}
              >
                {link.label}
              </Link>
            );
          })}

          <div className="pt-3 border-t border-black/[0.06]">
            {user ? (
              <div className="flex items-center justify-between px-2 py-1">
                <Link
                  href="/account"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2"
                >
                  <Cloud className="w-4 h-4 text-[#248A3D]" />
                  <span className="text-xs text-[#1D1D1F] font-semibold truncate max-w-[180px]">
                    {user.email}
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={async () => {
                    await handleSignOut();
                    setMobileMenuOpen(false);
                  }}
                  className="text-xs font-semibold text-[#FF3B30] hover:underline"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setIsAuthModalOpen(true);
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold bg-[#0071E3] text-white shadow-apple-sm"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In or Save History</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Embedded Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialView="auth"
        onAuthSuccess={refreshUser}
      />
    </header>
  );
};

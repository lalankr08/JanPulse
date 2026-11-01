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
  { code: 'en', label: 'EN' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'te', label: 'తెలుగు' },
  { code: 'bn', label: 'বাংলা' },
  { code: 'mr', label: 'मराठी' },
];

export const Navbar: React.FC<NavbarProps> = ({ language, setLanguage }) => {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setAuthPreference('guest');
  };

  const navLinks = [
    { href: '/', label: 'Forward Checker' },
    { href: '/schemes', label: 'Scheme Wizard' },
    { href: '/explain', label: 'Notifications' },
    { href: '/about', label: 'Sources & Ethics' },
    { href: '/account', label: 'History' },
  ];

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 border-b border-black/[0.06] transition-all">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0071E3] to-[#1E88E5] flex items-center justify-center text-white shadow-sm shadow-[#0071E3]/25 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-[17px] text-[#1D1D1F] tracking-tight group-hover:text-[#0071E3] transition-colors leading-tight">
                Jan-Pulse
              </span>
              <span className="text-[10px] text-[#86868B] font-medium tracking-normal">
                Civic Intelligence
              </span>
            </div>
          </Link>
          <span className="hidden lg:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-black/[0.04] text-[11px] font-medium text-[#86868B]">
            Official Record
          </span>
        </div>

        {/* Desktop Links */}
        <nav className="hidden md:flex items-center gap-1 bg-black/[0.03] p-1 rounded-full border border-black/[0.04]">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
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

        {/* Right side controls: Language switcher + Auth + Mobile toggle */}
        <div className="flex items-center gap-2">
          {/* Segmented language capsule */}
          <div className="flex items-center bg-black/[0.04] p-0.5 rounded-full border border-black/[0.04]">
            {LANGUAGES.slice(0, 3).map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => setLanguage(l.code)}
                className={`px-2.5 py-1 text-[11px] rounded-full transition-all ${
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
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-[#34C759]/10 text-[#248A3D] border border-[#34C759]/20 hover:bg-[#34C759]/15 transition-all"
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
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-black/[0.04] text-[#1D1D1F] hover:bg-black/[0.08] border border-black/[0.06] transition-all"
                title="Guest Mode: Searches saved on this device only. Click to sign in and save to account."
              >
                <Lock className="w-3 h-3 text-[#86868B]" />
                <span>Guest / Sign In</span>
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
                <div className="flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-[#248A3D]" />
                  <span className="text-xs text-[#1D1D1F] font-semibold truncate max-w-[180px]">
                    {user.email}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
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
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold bg-[#0071E3] text-white"
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
      />
    </header>
  );
};

import './globals.css';
import type { Metadata } from 'next';
import { BackendWarmer } from '@/components/BackendWarmer';

export const metadata: Metadata = {
  metadataBase: new URL('https://janpulse.lalankr.in'),
  title: {
    default: 'Jan-Pulse — Civic Intelligence and Verification for Indian Citizens',
    template: '%s | Jan-Pulse'
  },
  description: 'Verify viral forwards, check scheme eligibility, and understand government notifications against official public records.',
  openGraph: {
    title: 'Jan-Pulse — Civic Intelligence and Verification for Indian Citizens',
    description: 'Verify viral WhatsApp forwards, check scheme eligibility, and understand government notifications against official PIB and gazette records.',
    url: 'https://janpulse.lalankr.in',
    siteName: 'Jan-Pulse Civic Verification',
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Jan-Pulse — Civic Intelligence and Verification for Indian Citizens',
    description: 'Verify viral WhatsApp forwards, check scheme eligibility, and understand government notifications against official PIB and gazette records.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen flex flex-col bg-[#FBF9F5] text-[#1E2430]" suppressHydrationWarning>
        <div className="flex-1">
          {children}
        </div>
        
        {/* Footer */}
        <footer className="border-t border-[#E7E2D8] bg-white py-6 mt-16 text-center text-xs text-[#6B7280]">
          <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p>
              Jan-Pulse is an open-source civic verification engine. Data retrieved from official PIB, myScheme, and gazette portals.
            </p>
            <div className="flex gap-4 font-medium text-[#4B5563]">
              <a href="/about" className="hover:underline">Official Sources</a>
              <a href="/about#privacy" className="hover:underline">Privacy & Ethics</a>
              <a href="/account" className="hover:underline">Data Control</a>
            </div>
          </div>
        </footer>

        {/* Background health ping & status indicator */}
        <BackendWarmer />
      </body>
    </html>
  );
}

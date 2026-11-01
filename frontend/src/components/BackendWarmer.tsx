'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { getApiBase } from '@/lib/api';

export function BackendWarmer() {
  const [status, setStatus] = useState<'checking' | 'warming' | 'online' | 'hidden'>('checking');
  const [message, setMessage] = useState('Connecting to engine...');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // If backend was already confirmed warm during this tab session, skip
    if (typeof window !== 'undefined') {
      const alreadyWarmed = sessionStorage.getItem('janpulse_backend_online');
      if (alreadyWarmed) {
        setStatus('hidden');
        return;
      }
    }

    let isMounted = true;
    let pollInterval: NodeJS.Timeout | null = null;
    let wakeTimer: NodeJS.Timeout | null = null;
    const apiBase = getApiBase();

    // Show indicator after a brief 500ms delay to avoid flashing on instant local dev
    const showTimer = setTimeout(() => {
      if (isMounted && status !== 'hidden') {
        setVisible(true);
      }
    }, 500);

    const pingBackend = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const res = await fetch(`${apiBase}/health`, {
          signal: controller.signal,
          headers: { 'Accept': 'application/json' }
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          if (data.status === 'ok' && isMounted) {
            setStatus('online');
            setMessage('Engine Ready');
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('janpulse_backend_online', 'true');
            }
            if (pollInterval) clearInterval(pollInterval);
            if (wakeTimer) clearTimeout(wakeTimer);

            // Turn green, wait 2.5 seconds, then smoothly fade away
            setTimeout(() => {
              if (isMounted) {
                setVisible(false);
                setTimeout(() => {
                  if (isMounted) setStatus('hidden');
                }, 400);
              }
            }, 2500);
            return true;
          }
        }
      } catch {
        // Cold start in progress or network wait
      }
      return false;
    };

    // First immediate ping
    pingBackend().then(isUp => {
      if (!isUp && isMounted) {
        setStatus('warming');
        // If still waiting after 4 seconds, update text to notify about cold start
        wakeTimer = setTimeout(() => {
          if (isMounted && status !== 'online') {
            setMessage('Waking up verification engine...');
          }
        }, 4000);

        // Keep pinging every 3 seconds until Render wakes up
        pollInterval = setInterval(async () => {
          const up = await pingBackend();
          if (up && pollInterval) {
            clearInterval(pollInterval);
          }
        }, 3000);
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(showTimer);
      if (pollInterval) clearInterval(pollInterval);
      if (wakeTimer) clearTimeout(wakeTimer);
    };
  }, []);

  if (status === 'hidden') return null;

  return (
    <div
      className={`fixed bottom-5 right-5 z-50 transition-all duration-500 ease-out pointer-events-none ${
        visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-3 scale-95'
      }`}
    >
      <div className="bg-white/95 backdrop-blur-md shadow-apple-card border border-black/[0.08] rounded-full px-3.5 py-2 flex items-center gap-2.5 text-xs text-[#1D1D1F] select-none">
        {status === 'online' ? (
          <>
            <div className="w-4 h-4 rounded-full bg-[#34C759]/15 text-[#34C759] flex items-center justify-center animate-pulse">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#34C759]" />
            </div>
            <span className="font-semibold text-[#34C759]">Engine Ready</span>
          </>
        ) : (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0071E3]" />
            <span className="text-[#86868B] font-medium">{message}</span>
          </>
        )}
      </div>
    </div>
  );
}


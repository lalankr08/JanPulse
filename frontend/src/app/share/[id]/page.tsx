import type { Metadata } from 'next';
import { ShareCardClient } from './ShareCardClient';

interface Props {
  params: Promise<{ id: string }>;
}

const DEFAULT_API_BASE = "https://janpulse.onrender.com";

function getApiUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl && !envUrl.includes('<') && !envUrl.includes('your-api-url')) {
    return envUrl.replace(/\/docs\/?$/i, '').replace(/\/+$/, '');
  }
  return DEFAULT_API_BASE;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const apiBase = getApiUrl();

  try {
    const res = await fetch(`${apiBase}/v1/share/${id}`, {
      next: { revalidate: 60 }
    });

    if (res.ok) {
      const data = await res.json();
      const card = data.share_card;
      if (card) {
        const labelText = (card.label || 'VERIFIED').toUpperCase();
        const claimSnippet = card.claim_text ? `"${card.claim_text.slice(0, 80)}..."` : 'Citizen Claim';
        const title = `[${labelText}] ${claimSnippet} — Jan-Pulse Official Verification`;
        const description = card.explanation
          ? `${card.explanation.slice(0, 180)} (Verified against official Indian public records & gazettes).`
          : 'Sealed official fact-check record cross-referenced against authoritative government sources.';

        return {
          title,
          description,
          openGraph: {
            title,
            description,
            url: `https://janpulse.lalankr.in/share/${id}`,
            siteName: 'Jan-Pulse Civic Verification',
            type: 'article',
          },
          twitter: {
            card: 'summary_large_image',
            title,
            description,
          }
        };
      }
    }
  } catch (err) {
    console.warn(`[Share Metadata] Could not fetch share card ${id}:`, err);
  }

  return {
    title: 'Official Civic Verification Card — Jan-Pulse',
    description: 'Cryptographically sealed fact-check record cross-referenced against authoritative government sources.',
    openGraph: {
      title: 'Official Civic Verification Card — Jan-Pulse',
      description: 'Cryptographically sealed fact-check record cross-referenced against authoritative government sources.',
      url: `https://janpulse.lalankr.in/share/${id}`,
      siteName: 'Jan-Pulse Civic Verification',
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Official Civic Verification Card — Jan-Pulse',
      description: 'Cryptographically sealed fact-check record cross-referenced against authoritative government sources.',
    }
  };
}

export default async function SharePage({ params }: Props) {
  const { id } = await params;
  return <ShareCardClient shareId={id} />;
}

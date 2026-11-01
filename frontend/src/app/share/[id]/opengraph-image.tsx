import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Jan-Pulse Official Civic Verification Record';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

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

export default async function Image({ params }: Props) {
  const { id } = await params;
  let claim = 'Citizen WhatsApp Forward or Public Claim';
  let explanation = 'Cross-referenced against official PIB, e-Gazette, and myScheme records.';
  let label = 'VERIFIED';
  let labelBg = '#34C759';

  try {
    const apiBase = getApiUrl();
    const res = await fetch(`${apiBase}/v1/share/${id}`, {
      next: { revalidate: 60 }
    });
    if (res.ok) {
      const data = await res.json();
      const card = data.share_card;
      if (card) {
        claim = card.claim_text ? card.claim_text.slice(0, 140) : claim;
        explanation = card.explanation ? card.explanation.slice(0, 200) : explanation;
        label = (card.label || 'VERIFIED').toUpperCase();

        if (label.includes('CONTRADICTED') || label.includes('FALSE') || label.includes('HOAX')) {
          labelBg = '#FF3B30';
        } else if (label.includes('SUPPORTED') || label.includes('TRUE')) {
          labelBg = '#34C759';
        } else if (label.includes('PARTLY')) {
          labelBg = '#FF9500';
        } else {
          labelBg = '#8E8E93';
        }
      }
    }
  } catch (e) {
    // Fallback to defaults
  }

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: '#F5F5F7',
          padding: '50px 60px',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                backgroundColor: '#0071E3',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '24px',
                fontWeight: 'bold',
              }}
            >
              ✓
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '26px', fontWeight: 'bold', color: '#1D1D1F' }}>
                Jan-Pulse
              </span>
              <span style={{ fontSize: '14px', color: '#86868B', fontWeight: '500' }}>
                Official Civic Intelligence Record
              </span>
            </div>
          </div>

          <div
            style={{
              backgroundColor: labelBg,
              color: 'white',
              padding: '8px 24px',
              borderRadius: '999px',
              fontSize: '18px',
              fontWeight: 'bold',
              letterSpacing: '1px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {label}
          </div>
        </div>

        {/* Center: Claim & Finding Box */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            backgroundColor: 'white',
            borderRadius: '24px',
            padding: '36px 40px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
            border: '1px solid rgba(0,0,0,0.06)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#86868B', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Citizen Forwarded Claim
            </span>
            <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#1D1D1F', marginTop: '6px', fontStyle: 'italic' }}>
              &ldquo;{claim}&rdquo;
            </span>
          </div>

          <div style={{ width: '100%', height: '1px', backgroundColor: '#E5E5EA' }} />

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#86868B', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Official Grounded Finding
            </span>
            <span style={{ fontSize: '18px', color: '#3A3A3C', marginTop: '6px', lineHeight: '1.4' }}>
              {explanation}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '15px', color: '#86868B', fontWeight: '500' }}>
            Cross-referenced with PIB &middot; Gazette of India &middot; myScheme Registry
          </span>
          <span style={{ fontSize: '16px', color: '#0071E3', fontWeight: 'bold' }}>
            janpulse.lalankr.in
          </span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}

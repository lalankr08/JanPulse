import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Jan-Pulse — Civic Intelligence and Verification for Indian Citizens';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: '#0F172A',
          padding: '60px 70px',
          fontFamily: 'sans-serif',
          color: 'white',
        }}
      >
        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '16px',
                backgroundColor: '#0071E3',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '28px',
                fontWeight: 'bold',
              }}
            >
              ✓
            </div>
            <span style={{ fontSize: '32px', fontWeight: 'bold', letterSpacing: '-0.5px' }}>
              Jan-Pulse
            </span>
          </div>

          <div
            style={{
              backgroundColor: 'rgba(255,255,255,0.1)',
              padding: '8px 20px',
              borderRadius: '999px',
              fontSize: '15px',
              color: '#38BDF8',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              fontWeight: '600',
            }}
          >
            Official Civic Intelligence Engine
          </div>
        </div>

        {/* Center Main Message */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', maxWidth: '950px' }}>
          <h1
            style={{
              fontSize: '52px',
              fontWeight: '800',
              lineHeight: '1.15',
              margin: 0,
              background: 'linear-gradient(90deg, #FFFFFF 0%, #94A3B8 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
            }}
          >
            Civic Verification & Scheme Intelligence for Indian Citizens
          </h1>
          <p style={{ fontSize: '22px', color: '#94A3B8', margin: 0, lineHeight: '1.4' }}>
            Verify viral WhatsApp forwards, check public scheme eligibility, and decode official gazette notifications against verified government records.
          </p>
        </div>

        {/* Bottom Bar: Badges */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '24px' }}>
          <div style={{ display: 'flex', gap: '24px', fontSize: '16px', color: '#CBD5E1' }}>
            <span>✓ PIB Fact Check</span>
            <span>✓ The Gazette of India</span>
            <span>✓ myScheme Registry</span>
          </div>

          <span style={{ fontSize: '18px', color: '#38BDF8', fontWeight: 'bold' }}>
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

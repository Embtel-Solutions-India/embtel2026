import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

export const OG_SIZE = { width: 1200, height: 630 };

// Manrope 800 (SIL OFL, see src/assets/fonts/Manrope-OFL.txt). Read once per instance.
let font: Promise<Buffer> | null = null;
const manrope = () => (font ??= readFile(join(process.cwd(), 'src/assets/fonts/manrope-800.woff')));

export async function renderOgImage({ title, eyebrow }: { title: string; eyebrow?: string }): Promise<ImageResponse> {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 80px',
          background: '#09090B',
          backgroundImage:
            'radial-gradient(ellipse 900px 500px at 50% -120px, rgba(26,107,255,.35), transparent 70%), radial-gradient(ellipse 500px 400px at 110% 110%, rgba(0,200,150,.18), transparent 70%)',
          color: '#fff',
          fontFamily: 'Manrope',
        }}
      >
        <div style={{ display: 'flex', fontSize: 24, letterSpacing: 4, textTransform: 'uppercase', color: '#00C896' }}>
          {eyebrow ?? 'Embtel Solutions'}
        </div>
        <div style={{ display: 'flex', fontSize: title.length > 40 ? 68 : 84, lineHeight: 1.05, letterSpacing: -2, maxWidth: 1000 }}>{title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 28, color: '#C4C4D1' }}>
          <div style={{ width: 14, height: 14, borderRadius: 7, background: '#1A6BFF' }} />
          embtelsolutions.com
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: [{ name: 'Manrope', data: await manrope(), style: 'normal', weight: 800 }] },
  );
}

export const OG_EYEBROW: Record<string, string> = {
  service: 'Service',
  landing: 'AI Automation',
  industry: 'Industry',
  legal: 'Legal',
  standard: 'Embtel Solutions',
};

// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { GoogleAdsTag } from '@/components/site/ThirdPartyScripts';

vi.mock('next/script', () => ({
  default: ({ children, id, src, nonce }: { children?: string; id?: string; src?: string; nonce?: string }) => (
    // eslint-disable-next-line @next/next/no-sync-scripts -- test double for next/script
    <script data-testid={id ?? 'external'} src={src} nonce={nonce}>
      {children}
    </script>
  ),
}));

afterEach(cleanup);

describe('GoogleAdsTag', () => {
  it('loads gtag with the nonce and configures the conversion id', () => {
    const { container } = render(<GoogleAdsTag adsId="AW-18518114785" nonce="n0nce" />);
    const scripts = [...container.querySelectorAll('script')];
    expect(scripts.map((s) => s.getAttribute('src'))).toContain('https://www.googletagmanager.com/gtag/js?id=AW-18518114785');
    expect(scripts.every((s) => s.nonce === 'n0nce' || s.getAttribute('nonce') === 'n0nce')).toBe(true);
    expect(container.textContent).toContain("gtag('config', 'AW-18518114785')");
  });

  it('renders nothing for an empty or malformed id', () => {
    for (const adsId of ['', "AW-1'); alert(1);//", 'G-ABC']) {
      const { container } = render(<GoogleAdsTag adsId={adsId} nonce="n" />);
      expect(container.querySelectorAll('script')).toHaveLength(0);
      cleanup();
    }
  });
});

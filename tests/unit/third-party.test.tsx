// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';

vi.mock('next/script', () => ({
  default: ({ children, id, src, nonce }: { children?: string; id?: string; src?: string; nonce?: string }) => (
    // eslint-disable-next-line @next/next/no-sync-scripts -- test double for next/script
    <script data-testid={id ?? 'external'} src={src} nonce={nonce}>
      {children}
    </script>
  ),
}));

afterEach(cleanup);

describe('MarketingTags', () => {
  const none = { googleAdsId: '', googleAdsConversionLabel: '', ga4Id: '', gtmId: '', gscVerification: '', tawkPropertyId: '', tawkWidgetId: '', elfsightReviewsAppId: '', formspreeFormId: '' };
  const srcs = (c: HTMLElement) => [...c.querySelectorAll('script')].map((s) => s.getAttribute('src')).filter(Boolean);

  it('requests no third-party script when nothing is configured', async () => {
    const { MarketingTags } = await import('@/components/site/ThirdPartyScripts');
    const { container } = render(<MarketingTags integrations={none} nonce="n" />);
    expect(srcs(container)).toEqual([]);
    expect(container.textContent).not.toMatch(/googletagmanager|tawk\.to/);
  });

  it('queues the Ads/GA4 config at once but loads gtag.js only on the first interaction', async () => {
    const { MarketingTags } = await import('@/components/site/ThirdPartyScripts');
    const { container } = render(<MarketingTags integrations={{ ...none, googleAdsId: 'AW-18518114785', ga4Id: 'G-ABC123XYZ' }} nonce="n0nce" />);
    expect(srcs(container)).toEqual([]); // no eager third-party request (Lighthouse: no third-party cookies)
    const text = container.textContent ?? '';
    expect(text).toContain("gtag('config', 'AW-18518114785')");
    expect(text).toContain("gtag('config', 'G-ABC123XYZ')");
    expect(text).toContain('https://www.googletagmanager.com/gtag/js?id=AW-18518114785');
    expect(text).toMatch(/pointerdown/);
    expect([...container.querySelectorAll('script')].every((s) => s.getAttribute('nonce') === 'n0nce')).toBe(true);
  });

  it('GTM and Tawk.to also wait for the first interaction', async () => {
    const { MarketingTags } = await import('@/components/site/ThirdPartyScripts');
    const { container } = render(<MarketingTags integrations={{ ...none, gtmId: 'GTM-ABCD12', tawkPropertyId: '0123456789abcdef01234567', tawkWidgetId: '1abcdefgh' }} nonce="n0nce" />);
    expect(srcs(container)).toEqual([]);
    expect(container.textContent).toContain('https://www.googletagmanager.com/gtm.js?id=GTM-ABCD12');
    expect(container.textContent).toContain('https://embed.tawk.to/0123456789abcdef01234567/1abcdefgh');
  });

  it('never interpolates a malformed id', async () => {
    const { MarketingTags } = await import('@/components/site/ThirdPartyScripts');
    const { container } = render(<MarketingTags integrations={{ ...none, ga4Id: "G-1');alert(1);//", gtmId: 'GTM-<x>' }} nonce="n" />);
    expect(container.textContent).not.toMatch(/alert\(1\)|GTM-<x>|googletagmanager/);
  });
});

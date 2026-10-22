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

  it('loads nothing when no integration is configured', async () => {
    const { MarketingTags } = await import('@/components/site/ThirdPartyScripts');
    const { container } = render(<MarketingTags integrations={none} nonce="n" />);
    expect(container.querySelectorAll('script')).toHaveLength(0);
  });

  it('GA4 and Ads share one gtag.js and each get a config call', async () => {
    const { MarketingTags } = await import('@/components/site/ThirdPartyScripts');
    const { container } = render(<MarketingTags integrations={{ ...none, googleAdsId: 'AW-18518114785', ga4Id: 'G-ABC123XYZ' }} nonce="n" />);
    expect(srcs(container).filter((s) => s!.includes('gtag/js'))).toHaveLength(1);
    expect(container.textContent).toContain("gtag('config', 'AW-18518114785')");
    expect(container.textContent).toContain("gtag('config', 'G-ABC123XYZ')");
  });

  it('GTM and Tawk.to load from their official hosts with the nonce', async () => {
    const { MarketingTags } = await import('@/components/site/ThirdPartyScripts');
    const { container } = render(<MarketingTags integrations={{ ...none, gtmId: 'GTM-ABCD12', tawkPropertyId: '0123456789abcdef01234567', tawkWidgetId: '1abcdefgh' }} nonce="n0nce" />);
    expect(container.textContent).toContain('GTM-ABCD12');
    expect(srcs(container)).toContain('https://embed.tawk.to/0123456789abcdef01234567/1abcdefgh');
    expect([...container.querySelectorAll('script')].every((s) => s.getAttribute('nonce') === 'n0nce')).toBe(true);
  });

  it('never interpolates a malformed id', async () => {
    const { MarketingTags } = await import('@/components/site/ThirdPartyScripts');
    const { container } = render(<MarketingTags integrations={{ ...none, ga4Id: "G-1');alert(1);//", gtmId: 'GTM-<x>' }} nonce="n" />);
    expect(container.querySelectorAll('script')).toHaveLength(0);
  });
});

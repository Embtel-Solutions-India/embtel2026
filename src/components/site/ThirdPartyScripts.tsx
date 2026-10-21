import Script from 'next/script';

const ADS_ID = /^AW-\d+$/;

// Google Ads tag. Both scripts carry the request nonce (strict-dynamic CSP); the id is validated
// before it is interpolated into inline JS.
export function GoogleAdsTag({ adsId, nonce }: { adsId: string; nonce?: string }) {
  if (!ADS_ID.test(adsId)) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${adsId}`} strategy="afterInteractive" nonce={nonce} />
      <Script id="gtag-init" strategy="afterInteractive" nonce={nonce}>
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${adsId}');`}
      </Script>
    </>
  );
}

// Elfsight platform loader, only on pages that render a reviews widget.
export function ElfsightLoader({ nonce }: { nonce?: string }) {
  return <Script src="https://elfsightcdn.com/platform.js" strategy="lazyOnload" nonce={nonce} />;
}

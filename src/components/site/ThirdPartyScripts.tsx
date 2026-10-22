import Script from 'next/script';
import type { SiteSettings } from '@/lib/content/settings';

// Every id is format-checked here as well as by the settings schema, because it is interpolated into inline JS.
const ADS_ID = /^AW-\d+$/;
const GA4_ID = /^G-[A-Z0-9]{4,20}$/;
const GTM_ID = /^GTM-[A-Z0-9]{4,12}$/;
const TAWK_PROPERTY = /^[a-f0-9]{24}$/;
const TAWK_WIDGET = /^[a-z0-9]{6,20}$/;

// Marketing tags configured on the admin Integrations screen. All scripts carry the request nonce
// (strict-dynamic CSP). Tags load after hydration; the chat widget only once the page is idle.
export function MarketingTags({ integrations: i, nonce }: { integrations: SiteSettings['integrations']; nonce?: string }) {
  const gtagIds = [i.googleAdsId, i.ga4Id].filter((id, n) => (n === 0 ? ADS_ID : GA4_ID).test(id));
  const gtm = GTM_ID.test(i.gtmId) ? i.gtmId : '';
  const tawk = TAWK_PROPERTY.test(i.tawkPropertyId) && TAWK_WIDGET.test(i.tawkWidgetId) ? `${i.tawkPropertyId}/${i.tawkWidgetId}` : '';
  return (
    <>
      {gtagIds.length > 0 && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gtagIds[0]}`} strategy="afterInteractive" nonce={nonce} />
          <Script id="gtag-init" strategy="afterInteractive" nonce={nonce}>
            {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
${gtagIds.map((id) => `gtag('config', '${id}');`).join('\n')}`}
          </Script>
        </>
      )}
      {gtm && (
        <Script id="gtm-init" strategy="afterInteractive" nonce={nonce}>
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.nonce='${nonce ?? ''}';j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtm}');`}
        </Script>
      )}
      {tawk && <Script src={`https://embed.tawk.to/${tawk}`} strategy="lazyOnload" nonce={nonce} />}
    </>
  );
}

// Elfsight platform loader, only on pages that render a reviews widget.
export function ElfsightLoader({ nonce }: { nonce?: string }) {
  return <Script src="https://elfsightcdn.com/platform.js" strategy="lazyOnload" nonce={nonce} />;
}

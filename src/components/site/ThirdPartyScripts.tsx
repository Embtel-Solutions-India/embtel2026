import Script from 'next/script';
import type { SiteSettings } from '@/lib/content/settings';

// Every id is format-checked here as well as by the settings schema, because it is interpolated into inline JS.
const ADS_ID = /^AW-\d+$/;
const GA4_ID = /^G-[A-Z0-9]{4,20}$/;
const GTM_ID = /^GTM-[A-Z0-9]{4,12}$/;
const TAWK_PROPERTY = /^[a-f0-9]{24}$/;
const TAWK_WIDGET = /^[a-z0-9]{6,20}$/;
const ATTR_KEYS = ['gclid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];

// Marketing tags configured on the admin Integrations screen (owner decision 2026-10-23):
// - the gtag config is queued at once (window.dataLayer), so nothing configured is lost;
// - Google's scripts (gtag.js, GTM) and the Tawk.to widget load on the visitor's FIRST interaction
//   (scroll, tap, click, key), so a page view that never interacts sets no third-party cookies;
// - the Ads click ID and UTM parameters are kept first-party on arrival (localStorage, 90 days) so the
//   contact form can attribute a lead even after the visitor moved to another page.
// All inline scripts carry the request nonce; scripts they create are allowed by 'strict-dynamic'.
export function MarketingTags({ integrations: i, nonce }: { integrations: SiteSettings['integrations']; nonce?: string }) {
  const gtagIds = [i.googleAdsId, i.ga4Id].filter((id, n) => (n === 0 ? ADS_ID : GA4_ID).test(id));
  const gtm = GTM_ID.test(i.gtmId) ? i.gtmId : '';
  const tawk = TAWK_PROPERTY.test(i.tawkPropertyId) && TAWK_WIDGET.test(i.tawkWidgetId) ? `${i.tawkPropertyId}/${i.tawkWidgetId}` : '';
  const deferred = [
    ...(gtagIds.length ? [`https://www.googletagmanager.com/gtag/js?id=${gtagIds[0]}`] : []),
    ...(gtm ? [`https://www.googletagmanager.com/gtm.js?id=${gtm}`] : []),
    ...(tawk ? [`https://embed.tawk.to/${tawk}`] : []),
  ];
  const attribution = `try{var q=new URLSearchParams(location.search),a={};${JSON.stringify(ATTR_KEYS)}.forEach(function(k){var v=q.get(k);if(v)a[k]=v.slice(0,200)});if(Object.keys(a).length){a.at=Date.now();localStorage.setItem('embtel_attr',JSON.stringify(a))}}catch(e){}`;
  const queue = [
    'window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;',
    ...(gtagIds.length ? ["gtag('js', new Date());", ...gtagIds.map((id) => `gtag('config', '${id}');`)] : []),
    ...(gtm ? ["dataLayer.push({'gtm.start':new Date().getTime(),event:'gtm.js'});"] : []),
  ].join('\n');
  const loader = `(function(){var ev=['scroll','pointerdown','keydown','touchstart'],done=false;function load(){if(done)return;done=true;ev.forEach(function(e){removeEventListener(e,load,true)});${JSON.stringify(deferred)}.forEach(function(src){var s=document.createElement('script');s.async=true;s.src=src;s.nonce=${JSON.stringify(nonce ?? '')};document.head.appendChild(s)})}ev.forEach(function(e){addEventListener(e,load,{capture:true,passive:true})})})();`;
  return (
    <>
      <Script id="attribution" strategy="afterInteractive" nonce={nonce}>
        {attribution}
      </Script>
      {deferred.length > 0 && (
        <Script id="tags-on-interaction" strategy="afterInteractive" nonce={nonce}>
          {`${queue}\n${loader}`}
        </Script>
      )}
    </>
  );
}

// Elfsight platform loader, only on pages that render a reviews widget.
export function ElfsightLoader({ nonce }: { nonce?: string }) {
  return <Script src="https://elfsightcdn.com/platform.js" strategy="lazyOnload" nonce={nonce} />;
}

import Script from 'next/script';
import type { SiteSettings } from '@/lib/content/settings';

// Every id is format-checked here as well as by the settings schema, because it is interpolated into inline JS.
const ADS_ID = /^AW-\d+$/;
const GA4_ID = /^G-[A-Z0-9]{4,20}$/;
const GTM_ID = /^GTM-[A-Z0-9]{4,12}$/;
const TAWK_PROPERTY = /^[a-f0-9]{24}$/;
const TAWK_WIDGET = /^[a-z0-9]{6,20}$/;
const ATTR_KEYS = ['gclid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
// EEA + UK + Switzerland (ISO 3166-1), where analytics/ads cookies need opt-in consent.
const CONSENT_REGIONS = 'AT BE BG HR CY CZ DK EE FI FR DE GR HU IS IE IT LV LI LT LU MT NL NO PL PT RO SK SI ES SE GB CH'.split(' ');

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
  // Booking links carry no hard-coded UTMs (audit F-01/F-02); on click they get the visitor's own click ID/UTMs, if any.
  const attribution = `try{var q=new URLSearchParams(location.search),a={};${JSON.stringify(ATTR_KEYS)}.forEach(function(k){var v=q.get(k);if(v)a[k]=v.slice(0,200)});if(Object.keys(a).length){a.at=Date.now();localStorage.setItem('embtel_attr',JSON.stringify(a))}}catch(e){}
document.addEventListener('click',function(e){var l=e.target&&e.target.closest&&e.target.closest('a[href*="leadconnectorhq.com/widget/booking"]');if(!l)return;try{var q=new URLSearchParams(location.search),s=JSON.parse(localStorage.getItem('embtel_attr')||'{}'),u=new URL(l.href);if(!(Date.now()-s.at<7776e6))s={};${JSON.stringify(ATTR_KEYS)}.forEach(function(k){var v=q.get(k)||s[k];if(v&&!u.searchParams.has(k))u.searchParams.set(k,String(v).slice(0,200))});l.href=u.href}catch(x){}},true);`;
  // Consent Mode v2: EEA/UK/CH visitors are denied until they accept; elsewhere granted until they opt out
  // (CookieConsent banner / "Do Not Sell or Share" link). A browser Global Privacy Control signal opts out of ads.
  const consent = [
    `gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',wait_for_update:500,region:${JSON.stringify(CONSENT_REGIONS)}});`,
    "gtag('consent','default',{ad_storage:'granted',ad_user_data:'granted',ad_personalization:'granted',analytics_storage:'granted'});",
    "try{var c=localStorage.getItem('embtel_consent');if(c){var g=c==='all'?'granted':'denied';gtag('consent','update',{ad_storage:g,ad_user_data:g,ad_personalization:g,analytics_storage:g})}}catch(e){}",
    "if(navigator.globalPrivacyControl)gtag('consent','update',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});",
  ].join('\n');
  const queue = [
    'window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;',
    consent,
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

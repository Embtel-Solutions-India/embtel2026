'use client';

import { useSyncExternalStore } from 'react';
import Link from 'next/link';

const KEY = 'embtel_consent';
type Gtag = (...args: unknown[]) => void;

// Banner visibility as a tiny external store: open while no choice is stored, or after the footer link reopens it.
let reopened = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
// Same-tab changes notify directly; other tabs' choices arrive as 'storage' events.
const subscribe = (l: () => void) => {
  listeners.add(l);
  window.addEventListener('storage', l);
  return () => {
    listeners.delete(l);
    window.removeEventListener('storage', l);
  };
};
function isOpen() {
  if (reopened) return true;
  try {
    return !localStorage.getItem(KEY);
  } catch {
    return true;
  }
}

function choose(choice: 'all' | 'essential') {
  try {
    localStorage.setItem(KEY, choice);
  } catch {
    // storage blocked: applies to this page view only
  }
  const g = choice === 'all' ? 'granted' : 'denied';
  // Global Privacy Control always wins for ads, even after "Accept all".
  const ads = (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl ? 'denied' : g;
  const w = window as unknown as { gtag?: Gtag; dataLayer?: unknown[] };
  w.gtag?.('consent', 'update', { ad_storage: ads, ad_user_data: ads, ad_personalization: ads, analytics_storage: g });
  (w.dataLayer ??= []).push({ event: 'consent_update', consent: choice });
  reopened = false;
  notify();
}

// Cookie / privacy-choices banner (audit F-14/F-15). Shown until the visitor chooses; the footer's
// "Your Privacy Choices" link reopens it. The choice drives Google Consent Mode (see MarketingTags).
export function CookieConsent() {
  const open = useSyncExternalStore(subscribe, isOpen, () => false);
  if (!open) return null;
  return (
    <div
      id="privacy-choices"
      role="region"
      aria-label="Privacy choices"
      tabIndex={-1}
      className="fixed inset-x-4 bottom-4 z-[1000] mx-auto max-w-[720px] rounded-14 border border-white/10 bg-ink2 p-5 text-sm leading-[1.6] text-m2 shadow-[0_16px_40px_rgba(0,0,0,.4)]"
    >
      <p>
        We use cookies for analytics and advertising, including sharing data with Google, Meta and LinkedIn to show you relevant ads. You can accept, or opt out of
        everything except essential cookies. See our{' '}
        <Link href="/privacy-policy#cookies" className="text-white underline">
          Privacy Policy
        </Link>
        .
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" onClick={() => choose('all')} className="rounded-14 bg-blue px-5 py-2.5 font-semibold text-white hover:bg-[#3b7fff]">
          Accept all
        </button>
        <button type="button" onClick={() => choose('essential')} className="rounded-14 border border-white/10 bg-white/[.04] px-5 py-2.5 font-semibold text-m3 hover:bg-white/[.07]">
          Essential only
        </button>
      </div>
    </div>
  );
}

export function PrivacyChoicesLink({ className }: { className?: string }) {
  return (
    <button type="button" className={className} onClick={() => {
        reopened = true;
        notify();
        // Move keyboard / screen-reader focus to the reopened banner.
        requestAnimationFrame(() => document.getElementById('privacy-choices')?.focus());
      }}>
      Your Privacy Choices
    </button>
  );
}

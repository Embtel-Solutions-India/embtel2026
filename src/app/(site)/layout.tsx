import '@/components/blocks/blocks.css';
import '@/components/blocks/blocks-special.css';
import { Footer } from '@/components/site/Footer';
import { Header } from '@/components/site/Header';
import { GoogleAdsTag } from '@/components/site/ThirdPartyScripts';
import { WhatsAppLink } from '@/components/site/WhatsAppLink';
import { headers } from 'next/headers';
import { connection } from 'next/server';
import { getSiteSettings } from '@/lib/content/settings';

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  // Read settings per request (cached across requests) — never at build time, when there is no DB.
  await connection();
  const settings = await getSiteSettings();
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[1100] focus:rounded-8 focus:bg-blue focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <Header settings={settings} />
      <main id="main" className="pt-[68px]">
        {children}
      </main>
      <Footer settings={settings} />
      <WhatsAppLink whatsapp={settings.whatsapp} />
      <GoogleAdsTag adsId={settings.integrations.googleAdsId} nonce={nonce} />
    </>
  );
}

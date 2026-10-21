import Image from 'next/image';
import Link from 'next/link';
import type { SiteSettings } from '@/lib/content/settings';
import { NETWORK_LABELS, SocialIcon } from './SocialIcon';

const HOVER: Record<string, string> = {
  facebook: 'hover:text-[#1877F2]',
  instagram: 'hover:text-[#E4405F]',
  linkedin: 'hover:text-[#0A66C2]',
  x: 'hover:text-white',
};

const colLink = 'block py-1 text-sm text-m2 transition-colors hover:text-white';

export function Footer({ settings }: { settings: SiteSettings }) {
  const { footer, organization: org, social } = settings;
  return (
    <footer className="border-t border-white/[.06] bg-ink2">
      <div className="container-site grid gap-10 py-16 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr]">
        <div>
          <Image src={settings.logo} alt={org.name} width={126} height={48} />
          {footer.description && <p className="mt-4 max-w-[340px] text-sm leading-[1.7] text-m2">{footer.description}</p>}
        </div>
        {footer.columns.map((col) => (
          <div key={col.title}>
            <h2 className="mb-4 font-display text-sm font-bold text-white">{col.title}</h2>
            {col.links.map((l) => (
              <Link key={l.href + l.label} href={l.href} className={colLink}>
                {l.label}
              </Link>
            ))}
          </div>
        ))}
        <div>
          <h2 className="mb-4 font-display text-sm font-bold text-white">Contact Us</h2>
          {org.email && (
            <a href={`mailto:${org.email}`} className={colLink}>
              {org.email}
            </a>
          )}
          {org.phone && (
            <a href={`tel:${org.phone}`} className={colLink}>
              {org.phoneDisplay || org.phone}
            </a>
          )}
          {social.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-[18px]">
              {social.map((s) => (
                <a
                  key={s.network}
                  href={s.url}
                  target="_blank"
                  rel="noopener"
                  aria-label={NETWORK_LABELS[s.network].replace(' (Twitter)', '')}
                  className={`text-m3 transition-all hover:-translate-y-0.5 ${HOVER[s.network]}`}
                >
                  <SocialIcon network={s.network} />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="container-site flex justify-between gap-2.5 border-t border-white/[.06] py-6 text-[13px] text-m1 max-lg:flex-col max-lg:text-center">
        <span>{footer.copyright}</span>
        <span>
          {footer.legalLinks.map((l, i) => (
            <span key={l.href}>
              {i > 0 && ' · '}
              <Link href={l.href} className="hover:text-white">
                {l.label}
              </Link>
            </span>
          ))}
        </span>
      </div>
    </footer>
  );
}

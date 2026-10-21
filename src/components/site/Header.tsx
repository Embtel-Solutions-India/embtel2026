import Image from 'next/image';
import Link from 'next/link';
import type { SiteSettings } from '@/lib/content/settings';
import { HeaderMenu } from './HeaderMenu';

export function Header({ settings }: { settings: SiteSettings }) {
  return (
    <header className="fixed inset-x-0 top-0 z-[999] h-[68px] border-b border-white/5">
      <div className="absolute inset-0 bg-[rgba(9,9,11,.85)] backdrop-blur-[24px]" />
      <nav aria-label="Main" className="container-site relative flex h-full items-center justify-between">
        <Link href="/" aria-label={`${settings.organization.name} home`}>
          <Image src={settings.logo} alt={settings.organization.name} width={126} height={48} priority />
        </Link>
        <HeaderMenu nav={settings.headerNav} cta={settings.headerCta} />
      </nav>
    </header>
  );
}

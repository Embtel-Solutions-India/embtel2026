import type { SiteSettings } from '@/lib/content/settings';
import { SocialIcon } from './SocialIcon';

export function WhatsAppLink({ whatsapp }: { whatsapp: SiteSettings['whatsapp'] }) {
  if (!whatsapp) return null;
  const href = `https://wa.me/${whatsapp.number}?text=${encodeURIComponent(whatsapp.message)}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-7 right-7 z-[997] flex h-[58px] w-[58px] items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_4px_24px_rgba(37,211,102,.4)] transition-transform hover:scale-105"
    >
      <SocialIcon network="whatsapp" size={30} />
    </a>
  );
}

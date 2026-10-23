import { SocialIcon } from '@/components/site/SocialIcon';

// Plain share links (no third-party scripts).
export function ShareLinks({ url, title }: { url: string; title: string }) {
  const u = encodeURIComponent(url);
  const links = [
    { network: 'facebook' as const, label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { network: 'x' as const, label: 'X', href: `https://twitter.com/intent/tweet?url=${u}&text=${encodeURIComponent(title)}` },
    { network: 'linkedin' as const, label: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
  ];
  return (
    <div className="bd-share">
      <span>Share</span>
      {links.map((l) => (
        <a key={l.network} href={l.href} target="_blank" rel="noopener" aria-label={`Share on ${l.label}`}>
          <SocialIcon network={l.network} size={16} />
        </a>
      ))}
    </div>
  );
}

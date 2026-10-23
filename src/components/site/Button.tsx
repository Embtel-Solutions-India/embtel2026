import Link from 'next/link';

export type ButtonVariant = 'primary' | 'ghost';

const STYLES: Record<ButtonVariant, string> = {
  primary:
    'bg-blue text-white hover:bg-[#3b7fff] hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(26,107,255,.3)]',
  ghost: 'border border-white/10 bg-white/[.04] text-m3 hover:border-white/20 hover:bg-white/[.07]',
};

const BASE =
  'inline-flex items-center gap-2 rounded-14 px-8 py-3.5 font-display text-[15px] font-semibold transition-all duration-200';

// Allowed link targets: internal paths, https, tel and mailto. Anything else (javascript:, data:) → '#'.
export function safeHref(href: string): string {
  return /^(\/(?!\/)|https:\/\/|tel:|mailto:|#)/.test(href) ? href : '#';
}

export function Button({ label, href, variant = 'primary' }: { label: string; href: string; variant?: ButtonVariant }) {
  const target = safeHref(href);
  const className = `${BASE} ${STYLES[variant]}`;
  if (target.startsWith('/') || target === '#') {
    return (
      <Link href={target} className={className}>
        {label}
      </Link>
    );
  }
  return (
    <a href={target} className={className} rel={target.startsWith('https://') ? 'noopener' : undefined}>
      {label}
    </a>
  );
}

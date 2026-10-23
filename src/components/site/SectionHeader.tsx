import { renderInline } from '@/lib/content/inline';

export type SectionHeaderProps = {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  align?: 'left' | 'center';
  as?: 'h1' | 'h2';
};

export function SectionHeader({ eyebrow, title, subtitle, align = 'left', as: Heading = 'h2' }: SectionHeaderProps) {
  if (!eyebrow && !title && !subtitle) return null;
  const center = align === 'center';
  return (
    <div className={`mb-15 ${center ? 'text-center' : ''}`}>
      {eyebrow && (
        <p className="mb-3.5 text-[11.5px] font-bold uppercase tracking-[2px] text-ac">{eyebrow}</p>
      )}
      {title && (
        <Heading className="mb-4 font-display text-[clamp(30px,3.5vw,46px)] font-extrabold leading-[1.1] tracking-[-1.5px] text-white">
          {renderInline(title)}
        </Heading>
      )}
      {subtitle && (
        <p className={`max-w-[560px] text-base leading-[1.7] text-m2 ${center ? 'mx-auto' : ''}`}>{subtitle}</p>
      )}
    </div>
  );
}

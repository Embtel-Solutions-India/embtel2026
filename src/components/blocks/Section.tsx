import { SectionHeader, type SectionHeaderProps } from '@/components/site/SectionHeader';

export function Section({
  header,
  alt = false,
  children,
}: {
  header?: SectionHeaderProps;
  alt?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={`section ${alt ? 'section-alt' : ''}`}>
      <div className="section-in">
        {header && <SectionHeader {...header} />}
        {children}
      </div>
    </section>
  );
}

// "50" + "+" → 50<em>+</em> (legacy style: accent suffix).
export function Value({ value, suffix }: { value: string; suffix?: string }) {
  return (
    <>
      {value}
      {suffix && <em>{suffix}</em>}
    </>
  );
}

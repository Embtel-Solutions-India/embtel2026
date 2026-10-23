import type { BlockOf } from '@/lib/content/blocks';
import { Section } from './Section';

// Accordion uses native <details>: keyboard and screen-reader support with no JavaScript.
export function Faq({ block }: { block: BlockOf<'faq'> }) {
  const header = block.header ? { align: 'center' as const, ...block.header } : undefined;
  if (block.variant === 'static') {
    return (
      <Section header={header}>
        <div className="faq-static">
          {block.items.map((f, i) => (
            <div key={i} className="card">
              <h3>{f.q}</h3>
              <p>{f.a}</p>
            </div>
          ))}
        </div>
      </Section>
    );
  }
  return (
    <Section header={header}>
      <div className="faq-wrap">
        {block.items.map((f, i) => (
          <details key={i} className="faq-item">
            <summary>
              {f.q}
              <span className="faq-ico" aria-hidden="true">
                +
              </span>
            </summary>
            <p className="faq-a">{f.a}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}

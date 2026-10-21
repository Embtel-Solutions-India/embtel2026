import { Icon } from '@/components/site/Icon';
import type { BlockOf } from '@/lib/content/blocks';
import { Counter } from './Counter';
import { Section } from './Section';

export function Stats({ block }: { block: BlockOf<'stats'> }) {
  if (block.variant === 'bar') {
    return (
      <section className="statsbar">
        <dl className="statsbar-in">
          {block.items.map((s, i) => (
            <div key={i} className="flex flex-col-reverse">
              <dt className="stat-l">{s.label}</dt>
              <dd className="stat-n">
                {s.value}
                {s.suffix && <em>{s.suffix}</em>}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    );
  }
  return (
    <Section header={block.header} alt>
      <dl className="counter-grid">
        {block.items.map((s, i) => (
          <div key={i} className="ctr-wrap flex flex-col-reverse">
            <dt className="ctr-label">{s.label}</dt>
            <dd className="ctr-num">
              {s.icon && (
                <div className="ctr-icon">
                  <Icon icon={s.icon} size={28} />
                </div>
              )}
              {block.animate ? <Counter value={s.value} /> : s.value}
              {s.suffix && <em>{s.suffix}</em>}
            </dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}

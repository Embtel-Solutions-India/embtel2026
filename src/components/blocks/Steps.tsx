import { Fragment } from 'react';
import type { BlockOf } from '@/lib/content/blocks';
import { renderInline } from '@/lib/content/inline';
import { Section } from './Section';

export function Steps({ block }: { block: BlockOf<'steps'> }) {
  const num = (n: string | undefined, i: number) => n ?? String(i + 1).padStart(2, '0');

  if (block.variant === 'flow') {
    return (
      <Section header={block.header}>
        <ol className="flow">
          {block.items.map((s, i) => (
            <Fragment key={i}>
              {i > 0 && (
                <li className="flow-arrow" aria-hidden="true">
                  →
                </li>
              )}
              <li className="card flow-step">
                <span className="step-num">{num(s.num, i)}</span>
                <h3>{renderInline(s.title)}</h3>
                <p>{s.body}</p>
              </li>
            </Fragment>
          ))}
        </ol>
      </Section>
    );
  }

  const process = block.variant === 'process';
  return (
    <Section header={block.header}>
      <ol className={`grid ${process ? 'cols-2 gap-6' : 'cols-2'}`}>
        {block.items.map((s, i) => (
          <li key={i} className={`card ${process ? 'proc-card' : 'pc'}`}>
            <span className={process ? 'proc-num' : 'pc-num'}>{num(s.num, i)}</span>
            <div>
              {s.week && <p className="proc-week">{s.week}</p>}
              <h3>{renderInline(s.title)}</h3>
              <p>{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </Section>
  );
}

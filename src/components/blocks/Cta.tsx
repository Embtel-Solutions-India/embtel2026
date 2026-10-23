import { Button } from '@/components/site/Button';
import type { BlockOf } from '@/lib/content/blocks';
import { renderInline } from '@/lib/content/inline';

export function Cta({ block }: { block: BlockOf<'cta'> }) {
  return (
    <section className="cta-band">
      <h2>{renderInline(block.heading)}</h2>
      {block.body && <p>{block.body}</p>}
      {block.buttons.length > 0 && (
        <div className="btn-row">
          {block.buttons.map((b, i) => (
            <Button key={b.href + i} label={b.label} href={b.href} variant={b.variant ?? (i === 0 ? 'primary' : 'ghost')} />
          ))}
        </div>
      )}
    </section>
  );
}

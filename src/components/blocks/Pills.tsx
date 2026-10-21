import { Icon } from '@/components/site/Icon';
import type { BlockOf } from '@/lib/content/blocks';
import { Section } from './Section';

export function Pills({ block }: { block: BlockOf<'pills'> }) {
  return (
    <Section header={block.header ? { align: 'center', ...block.header } : undefined} alt>
      <ul className="pill-row">
        {block.items.map((p, i) => (
          <li key={i} className="pill">
            <Icon icon={p.icon} size={15} />
            {p.label}
          </li>
        ))}
      </ul>
    </Section>
  );
}

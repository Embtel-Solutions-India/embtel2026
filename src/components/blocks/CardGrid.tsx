import Link from 'next/link';
import { Button } from '@/components/site/Button';
import { Icon } from '@/components/site/Icon';
import type { BlockOf } from '@/lib/content/blocks';
import { renderInline } from '@/lib/content/inline';
import { Section } from './Section';

type Item = BlockOf<'cardGrid'>['items'][number];
type Variant = BlockOf<'cardGrid'>['variant'];

const CARD: Record<Variant, string> = {
  service: 'card lift v-service topbar',
  feature: 'card v-feature',
  why: 'card lift v-why topbar',
  industry: 'card lift v-industry',
  industryLink: 'card lift v-industryLink',
  related: 'card v-related lift',
  pain: 'card v-pain lift',
  trust: 'card v-trust',
  audit: 'card v-audit',
};

function CardBody({ item, variant }: { item: Item; variant: Variant }) {
  const showIcon = item.icon && variant !== 'trust';
  return (
    <>
      {variant === 'trust' && (
        <p className="tick" aria-hidden="true">
          ✓
        </p>
      )}
      {variant === 'audit' && item.num && <p className="an">{item.num}</p>}
      {showIcon && (
        <div className={variant === 'industry' ? 'ico' : 'ico-box'}>
          <Icon icon={item.icon} size={variant === 'industry' ? 36 : 24} />
        </div>
      )}
      <div>
        <h3>{variant === 'pain' ? <q>{item.title}</q> : renderInline(item.title)}</h3>
        <p>{item.body}</p>
        {item.tags?.length ? (
          <ul className="tags">
            {item.tags.map((t) => (
              <li key={t} className="tag">
                {t}
              </li>
            ))}
          </ul>
        ) : null}
        {item.href && item.linkLabel && <span className="card-arrow">{item.linkLabel} →</span>}
      </div>
    </>
  );
}

export function CardGrid({ block }: { block: BlockOf<'cardGrid'> }) {
  const cols = block.variant === 'trust' ? 5 : block.variant === 'pain' ? 4 : block.columns;
  return (
    <Section header={block.header}>
      <ul className={`grid cols-${cols}`}>
        {block.items.map((item, i) => (
          <li key={i} className="flex">
            {item.href ? (
              <Link href={item.href} className={`${CARD[block.variant]} w-full`}>
                <CardBody item={item} variant={block.variant} />
              </Link>
            ) : (
              <div className={`${CARD[block.variant]} w-full`}>
                <CardBody item={item} variant={block.variant} />
              </div>
            )}
          </li>
        ))}
      </ul>
      {block.button && (
        <div className="grid-cta">
          <Button label={block.button.label} href={block.button.href} variant={block.button.variant} />
        </div>
      )}
    </Section>
  );
}

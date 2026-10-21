import Link from 'next/link';
import { Button } from '@/components/site/Button';
import type { BlockOf } from '@/lib/content/blocks';
import { renderInline } from '@/lib/content/inline';
import { Value } from './Section';

export function Hero({ block, primary }: { block: BlockOf<'hero'>; primary: boolean }) {
  // Only the page's first hero is the <h1>; any later one is a section heading.
  const Heading = primary ? 'h1' : 'h2';
  const heading = <Heading className="h1">{renderInline(block.heading)}</Heading>;
  const buttons = block.buttons?.length ? (
    <div className="btn-row">
      {block.buttons.map((b, i) => (
        <Button key={b.href + i} label={b.label} href={b.href} variant={b.variant ?? (i === 0 ? 'primary' : 'ghost')} />
      ))}
    </div>
  ) : null;

  if (block.variant === 'home') {
    return (
      <section className="hero">
        <div className="grid-overlay" />
        <div className="hero-glow-top" />
        <div className="hero-glow-bot" />
        <div className="hero-in">
          <div>
            {block.badge && (
              <p className="badge">
                <span className="badge-dot" aria-hidden="true" />
                {block.badge}
              </p>
            )}
            {heading}
            {block.lead && <p className="hero-lead">{block.lead}</p>}
            {buttons}
          </div>
          {block.floatingCards?.length ? (
            <div className="float-wrap" aria-hidden="true">
              {block.floatingCards.map((c, i) => (
                <div key={i} className="fcard">
                  <div className="fc-label">{c.label}</div>
                  {c.sub && <div className="fc-sub">{c.sub}</div>}
                  {c.stat && <div className="fc-stat">{c.stat}</div>}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section className="svc-hero">
      <div className="svc-hero-in">
        {block.breadcrumb?.length ? (
          <nav aria-label="Breadcrumb">
            <ol className="breadcrumb">
              {block.breadcrumb.map((c, i) => (
                <li key={i} className="flex items-center gap-2">
                  {i > 0 && <span aria-hidden="true">›</span>}
                  {c.href ? <Link href={c.href}>{c.label}</Link> : <span aria-current={i === block.breadcrumb!.length - 1 ? 'page' : undefined}>{c.label}</span>}
                </li>
              ))}
            </ol>
          </nav>
        ) : null}
        {block.badge && <p className="mb-3.5 text-[11.5px] font-bold uppercase tracking-[2px] text-[var(--ac)]">{block.badge}</p>}
        {heading}
        {block.lead && <p className="svc-lead">{block.lead}</p>}
        {buttons}
        {block.stats?.length ? (
          <dl className="svc-stats">
            {block.stats.map((s, i) => (
              <div key={i} className="svc-stat flex flex-col-reverse">
                <dt className="svc-stat-l">{s.label}</dt>
                <dd className="svc-stat-n">
                  <Value value={s.value} suffix={s.suffix} />
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
        {block.meta && <p className="hero-meta">{block.meta}</p>}
      </div>
    </section>
  );
}

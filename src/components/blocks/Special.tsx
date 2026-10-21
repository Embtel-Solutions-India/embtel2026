import Image from 'next/image';
import { Button } from '@/components/site/Button';
import { Icon } from '@/components/site/Icon';
import type { BlockOf } from '@/lib/content/blocks';
import { renderInline } from '@/lib/content/inline';
import { sanitizeRichHtml } from '@/lib/content/sanitize';
import type { SiteSettings } from '@/lib/content/settings';
import { Section } from './Section';

export function BeforeAfter({ block }: { block: BlockOf<'beforeAfter'> }) {
  return (
    <Section header={block.header ? { align: 'center', ...block.header } : undefined}>
      <div className="ba-wrap">
        {block.rows.map((r, i) => (
          <div key={i} className="ba-row">
            <div className="ba-before">
              <p className="ba-side-label before">Before</p>
              <h3 className="ba-title">{r.before.title}</h3>
              <ul className="ba-steps">
                {r.before.steps.map((s, j) => (
                  <li key={j} className="ba-step bad">
                    {s}
                  </li>
                ))}
              </ul>
            </div>
            <div className="ba-arrow" aria-hidden="true">
              →
            </div>
            <div className="ba-after">
              <p className="ba-side-label after">After</p>
              <h3 className="ba-title">{r.after.title}</h3>
              <ul className="ba-steps">
                {r.after.steps.map((s, j) => (
                  <li key={j} className="ba-step good">
                    {s}
                  </li>
                ))}
              </ul>
              {r.after.saving && <p className="ba-saving">{r.after.saving}</p>}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

const STATUS = {
  check: { sym: '✓', label: 'Yes', cls: 'check' },
  cross: { sym: '✗', label: 'No', cls: 'cross' },
  partial: { sym: '~', label: 'Partly', cls: 'partial' },
} as const;

export function ComparisonTable({ block }: { block: BlockOf<'comparisonTable'> }) {
  const hl = block.highlight + 1; // +1: first column is the row label
  return (
    <Section header={block.header ? { align: 'center', ...block.header } : undefined}>
      <div className="comp-wrap">
        <table className="comp-table">
          <thead>
            <tr>
              <th scope="col">
                <span className="sr-only">Feature</span>
              </th>
              {block.columns.map((c, i) => (
                <th key={c} scope="col" className={i + 1 === hl ? 'hl' : undefined}>
                  {i + 1 === hl && (
                    <span className="comp-best" aria-hidden="true">
                      ★ Best Choice
                    </span>
                  )}
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((r, i) => (
              <tr key={i}>
                <th scope="row">{r.label}</th>
                {r.cells.map((cell, j) => {
                  const s = STATUS[cell.status];
                  return (
                    <td key={j} className={j + 1 === hl ? 'hl' : undefined}>
                      <span className={s.cls} aria-hidden="true">
                        {s.sym}
                      </span>
                      <span className="sr-only">{s.label}</span>
                      {cell.text && <> {cell.text}</>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {block.button && (
        <div className="grid-cta">
          <Button label={block.button.label} href={block.button.href} variant={block.button.variant} />
        </div>
      )}
    </Section>
  );
}

export function WorkGrid({ block }: { block: BlockOf<'workGrid'> }) {
  return (
    <Section header={block.header}>
      <ul className="wg">
        {block.items.map((w, i) => (
          <li key={i} className="wc">
            <div className={`wc-img ${w.theme}`}>
              {w.logo ? (
                <Image src={w.logo.src} alt={w.logo.alt} width={96} height={96} />
              ) : (
                w.fallbackEmoji && <span aria-hidden="true">{w.fallbackEmoji}</span>
              )}
            </div>
            <div className="wc-body">
              <ul className="wc-tags">
                {w.tags.map((t) => (
                  <li key={t.label} className={`tag tag-${t.tone}`}>
                    {t.label}
                  </li>
                ))}
              </ul>
              <h3>{w.url ? <a href={w.url} rel="noopener" target="_blank">{w.title}</a> : w.title}</h3>
              <p>{w.body}</p>
              <dl className="wc-metrics">
                {w.metrics.map((m, j) => (
                  <div key={j} className="wm flex flex-col-reverse">
                    <dt className="wm-l">{m.l}</dt>
                    <dd className="wm-n">{m.n}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}

export function Timeline({ block }: { block: BlockOf<'timeline'> }) {
  return (
    <Section header={block.header ? { align: 'center', ...block.header } : undefined}>
      <table className="evo-table">
        <thead>
          <tr>
            <th scope="col">Period</th>
            <th scope="col">Era</th>
            <th scope="col">Focus</th>
          </tr>
        </thead>
        <tbody>
          {block.rows.map((r, i) => (
            <tr key={i}>
              <th scope="row">{r.period}</th>
              <td className="evo-era">{r.era}</td>
              <td>{r.focus}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Section>
  );
}

export function Split({ block }: { block: BlockOf<'split'> }) {
  return (
    <Section>
      <div className="story-wrap">
        <div className="story-img">
          <Image src={block.image.src} alt={block.image.alt} width={block.image.width} height={block.image.height} />
        </div>
        <div className="story-text">
          {block.eyebrow && <p className="mb-3.5 text-[11.5px] font-bold uppercase tracking-[2px] text-[var(--ac)]">{block.eyebrow}</p>}
          <h2>{renderInline(block.heading)}</h2>
          {block.paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </div>
    </Section>
  );
}

export function Phases({ block }: { block: BlockOf<'phases'> }) {
  return (
    <Section header={block.header} alt>
      {block.items.map((ph, i) => (
        <div key={i} className="phase-block">
          <p className="phase-number">{ph.number}</p>
          <h3 className="phase-title">{ph.title}</h3>
          <p className="phase-desc">{ph.desc}</p>
          <ul className="grid cols-2">
            {ph.cards.map((c, j) => (
              <li key={j} className="card lift topbar service-card">
                <h4>{c.name}</h4>
                <p>{c.desc}</p>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </Section>
  );
}

export function Roi({ block }: { block: BlockOf<'roi'> }) {
  return (
    <Section header={block.header ? { align: 'center', ...block.header } : undefined}>
      <div className="roi-card">
        <p className="roi-math">{renderInline(block.math)}</p>
        {block.assumptions && <p className="roi-assump">{block.assumptions}</p>}
        {block.disclaimer && <p className="roi-disclaimer">{block.disclaimer}</p>}
      </div>
    </Section>
  );
}

export function RichText({ block }: { block: BlockOf<'richText'> }) {
  const { html, headings } = sanitizeRichHtml(block.html);
  return (
    <div className="legal-body">
      {block.toc && headings.length > 0 && (
        <nav aria-label="On this page" className="legal-toc">
          <p>On this page</p>
          <ol>
            {headings.map((h) => (
              <li key={h.id}>
                <a href={`#${h.id}`}>{h.text}</a>
              </li>
            ))}
          </ol>
        </nav>
      )}
      {/* Sanitised by sanitizeRichHtml: allow-listed tags/attributes only. */}
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

export function ContactInfo({ block }: { block: BlockOf<'contactInfo'> }) {
  return (
    <Section>
      <div className="contact-wrap">
        <div className="contact-info">
          {block.header?.title && (
            <h2 className="mb-4 font-display text-[clamp(30px,3vw,44px)] font-extrabold leading-[1.1] tracking-[-1.5px] text-white">
              {renderInline(block.header.title)}
            </h2>
          )}
          {block.lead && <p className="lead">{block.lead}</p>}
          <ul className="ci-list">
            {block.items.map((it, i) => (
              <li key={i} className="ci-item">
                <span className="ci-ico">
                  <Icon icon={it.icon} size={20} />
                </span>
                <div>
                  <strong>{it.label}</strong>
                  {it.href ? <a href={it.href}>{it.value}</a> : <span>{it.value}</span>}
                </div>
              </li>
            ))}
          </ul>
        </div>
        {/* Phase 5 mounts the lead form here. */}
        {block.formSlot && <div className="contact-form-slot" data-slot="contact-form" />}
      </div>
    </Section>
  );
}

export function Testimonials({ block, settings }: { block: BlockOf<'testimonials'>; settings: SiteSettings }) {
  const appId = settings.integrations.elfsightReviewsAppId;
  return (
    <Section header={block.header ? { align: 'center', ...block.header } : undefined}>
      {appId ? <div className={`elfsight-app-${appId}`} data-elfsight-app-lazy="" /> : <p className="sr-only">Reviews are unavailable.</p>}
    </Section>
  );
}

import type { BlockOf } from '@/lib/content/blocks';

export function Marquee({ block }: { block: BlockOf<'marquee'> }) {
  const list = (hidden: boolean) => (
    <ul aria-hidden={hidden || undefined}>
      {block.items.map((item, i) => (
        <li key={i} className="mitem">
          {item}
        </li>
      ))}
    </ul>
  );
  // The track holds two copies so the CSS loop is seamless; the copy is hidden from assistive tech.
  return (
    <section className="marquee-section" aria-label="What we do">
      <div className="marquee-track">
        {list(false)}
        {list(true)}
      </div>
    </section>
  );
}

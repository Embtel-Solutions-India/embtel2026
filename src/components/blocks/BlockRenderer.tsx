import type { Block } from '@/lib/content/blocks';
import type { SiteSettings } from '@/lib/content/settings';
import { CardGrid } from './CardGrid';
import { Cta } from './Cta';
import { Faq } from './Faq';
import { Hero } from './Hero';
import { Marquee } from './Marquee';
import { Pills } from './Pills';
import { Stats } from './Stats';
import { Steps } from './Steps';

function renderBlock(block: Block, primaryHero: boolean, settings: SiteSettings) {
  void settings;
  switch (block.type) {
    case 'hero':
      return <Hero block={block} primary={primaryHero} />;
    case 'marquee':
      return <Marquee block={block} />;
    case 'stats':
      return <Stats block={block} />;
    case 'cardGrid':
      return <CardGrid block={block} />;
    case 'steps':
      return <Steps block={block} />;
    case 'pills':
      return <Pills block={block} />;
    case 'faq':
      return <Faq block={block} />;
    case 'cta':
      return <Cta block={block} />;
    // Specialised sections land in Task 7.
    case 'beforeAfter':
    case 'comparisonTable':
    case 'testimonials':
    case 'contactInfo':
    case 'workGrid':
    case 'timeline':
    case 'split':
    case 'phases':
    case 'roi':
    case 'richText':
      return null;
    default: {
      const never: never = block;
      return never;
    }
  }
}

export function BlockRenderer({ blocks, settings }: { blocks: Block[]; settings: SiteSettings }) {
  const firstHero = blocks.findIndex((b) => b.type === 'hero');
  return <>{blocks.map((b, i) => <div key={i}>{renderBlock(b, i === firstHero, settings)}</div>)}</>;
}

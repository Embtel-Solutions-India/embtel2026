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
import { BeforeAfter, ComparisonTable, ContactInfo, Phases, RichText, Roi, Split, Testimonials, Timeline, WorkGrid } from './Special';

function renderBlock(block: Block, primaryHero: boolean, settings: SiteSettings, nonce?: string) {
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
    case 'beforeAfter':
      return <BeforeAfter block={block} />;
    case 'comparisonTable':
      return <ComparisonTable block={block} />;
    case 'testimonials':
      return <Testimonials block={block} settings={settings} nonce={nonce} />;
    case 'contactInfo':
      return <ContactInfo block={block} />;
    case 'workGrid':
      return <WorkGrid block={block} />;
    case 'timeline':
      return <Timeline block={block} />;
    case 'split':
      return <Split block={block} />;
    case 'phases':
      return <Phases block={block} />;
    case 'roi':
      return <Roi block={block} />;
    case 'richText':
      return <RichText block={block} />;
    default: {
      const never: never = block;
      return never;
    }
  }
}

export function BlockRenderer({ blocks, settings, nonce }: { blocks: Block[]; settings: SiteSettings; nonce?: string }) {
  const firstHero = blocks.findIndex((b) => b.type === 'hero');
  return <>{blocks.map((b, i) => <div key={i}>{renderBlock(b, i === firstHero, settings, nonce)}</div>)}</>;
}

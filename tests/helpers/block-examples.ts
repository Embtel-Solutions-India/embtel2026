import type { Block } from '@/lib/content/blocks';

const btn = { label: 'Start a Project →', href: '/contact' };

// One minimal valid example per block type.
export const EXAMPLES: Block[] = [
  { type: 'hero', variant: 'page', heading: 'Law *Industry*', lead: 'Modernize.', buttons: [btn], stats: [{ value: '50', suffix: '+', label: 'Clients' }] },
  { type: 'marquee', items: ['SEO', 'Automation'] },
  { type: 'stats', variant: 'counters', animate: true, items: [{ value: '50', suffix: '+', label: 'Projects' }] },
  { type: 'cardGrid', variant: 'feature', columns: 3, items: [{ title: 'Secure', body: 'Data safe.' }] },
  { type: 'steps', variant: 'compact', items: [{ num: '01', title: 'Discover', body: 'We listen.' }] },
  { type: 'pills', items: [{ label: 'React' }] },
  { type: 'beforeAfter', rows: [{ before: { title: 'Manual', steps: ['a'] }, after: { title: 'Auto', steps: ['b'], saving: '5h' } }] },
  { type: 'comparisonTable', columns: ['Embtel', 'Agency'], highlight: 0, rows: [{ label: 'Speed', cells: [{ status: 'check' }, { status: 'cross', text: 'Slow' }] }] },
  { type: 'faq', variant: 'accordion', items: [{ q: 'How long?', a: 'Weeks.' }] },
  { type: 'cta', heading: 'Ready to *grow?*', buttons: [btn] },
  { type: 'testimonials', provider: 'elfsight' },
  { type: 'contactInfo', items: [{ label: 'Email', value: 'info@embtelsolutions.com', href: 'mailto:info@embtelsolutions.com' }], formSlot: true },
  { type: 'workGrid', items: [{ title: 'USO1', body: 'Visa site.', theme: 'c1', tags: [{ label: 'Web', tone: 'b' }], metrics: [{ n: '3x', l: 'Leads' }] }] },
  { type: 'timeline', rows: [{ period: '2015', era: 'Start', focus: 'Web' }] },
  { type: 'split', image: { src: '/images/logo.png', alt: 'Office', width: 800, height: 600 }, heading: 'Our story', paragraphs: ['We began.'] },
  { type: 'phases', items: [{ number: '01', title: 'Web', desc: 'Sites.', cards: [{ name: 'SEO', desc: 'Rank.' }] }] },
  { type: 'roi', math: '10 calls × $200 = *$2,000*' },
  { type: 'richText', html: '<h2>Hi</h2><p>Text</p>', toc: true },
] as Block[];

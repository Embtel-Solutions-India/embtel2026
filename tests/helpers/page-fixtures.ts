// Minimal pages for e2e: a published home, a published industry page and a draft.
const cta = { type: 'cta', heading: 'Ready to *grow?*', buttons: [{ label: 'Start a Project →', href: '/contact' }] };

const base = {
  status: 'published',
  theme: { accent: '#1A6BFF' },
  seo: { noindex: false },
  locked: false,
};

export const PAGE_FIXTURES = [
  {
    ...base,
    slug: 'home',
    title: 'Embtel Solutions',
    type: 'standard',
    blocks: [
      { type: 'hero', variant: 'home', badge: 'AI-powered automation', heading: 'Technology that *grows* your business', lead: 'Websites, SEO and automation for growing US businesses.', buttons: [{ label: 'Get Started', href: '/contact' }] },
      { type: 'faq', variant: 'accordion', items: [{ q: 'How long does a website take?', a: 'Most sites launch in four to six weeks.' }] },
      cta,
    ],
  },
  {
    ...base,
    slug: 'law-industry',
    title: 'Law Industry',
    type: 'industry',
    blocks: [
      { type: 'hero', variant: 'page', breadcrumb: [{ label: 'Home', href: '/' }, { label: 'Industries', href: '/industries' }, { label: 'Law Industry' }], heading: 'Digital Solutions for *Law Firms*', lead: 'Modernize your legal practice with secure, compliant digital platforms that enhance client experience.', stats: [{ value: '50', suffix: '+', label: 'Firms served' }] },
      cta,
    ],
  },
  { ...base, slug: 'secret-draft', title: 'Secret Draft', type: 'standard', status: 'draft', blocks: [cta] },
];

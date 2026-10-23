import { describe, expect, it } from 'vitest';
import { scorePost, type ScoreInput } from '@/lib/seo/score';

const words = (n: number, w = 'word') => Array.from({ length: n }, () => w).join(' ');
// n words as 10-word sentences.
const prose = (n: number) => Array.from({ length: Math.ceil(n / 10) }, () => `${words(10)}.`).join(' ');
const good: ScoreInput = {
  title: 'Dental Automation Guide for Busy Practices',
  slug: 'dental-automation-guide',
  focusKeyword: 'dental automation',
  metaTitle: '',
  metaDescription: 'Dental automation cuts no-shows and admin time. Here is how small practices set it up in a week, step by step, with real numbers.',
  shortDescription: 'How practices automate reminders.',
  content: `<p>Dental automation helps. ${prose(120)} Short sentence here.</p><h2>Why dental automation pays</h2><p>${prose(20)} See <a href="/dental-automation">our service</a> and <a href="/contact">contact us</a>.</p><p>${prose(200)}</p><img src="/x.png" alt="Reminder screen">`,
  featuredImage: '/hero.png',
  imageAltText: 'Dentist using a tablet',
  faqs: [{ q: 'Q1?', a: 'A1.' }, { q: 'Q2?', a: 'A2.' }],
  keyTakeaways: ['Takeaway'],
  sources: [{ title: 'ADA', url: 'https://www.ada.org' }],
  authorHasBio: true,
};
const ctx = { otherTitles: ['Another Post'], otherDescriptions: ['Something else entirely for another page.'] };
const check = (input: Partial<ScoreInput>, id: string) => scorePost({ ...good, ...input }, ctx).checks.find((c) => c.id === id)!;

describe('scorePost', () => {
  it('a well-prepared post passes every check and scores 100', () => {
    const r = scorePost(good, ctx);
    expect(r.checks.filter((c) => !c.pass).map((c) => c.id)).toEqual([]);
    expect(r.score).toBe(100);
  });

  it.each([
    ['kw-set', { focusKeyword: '' }],
    ['kw-title', { title: 'A Guide for Busy Practices' }],
    ['kw-slug', { slug: 'guide-for-practices' }],
    ['kw-intro', { content: good.content.replace('Dental automation helps.', 'Hello.') }],
    ['kw-description', { metaDescription: 'Reminders cut no-shows and admin time for small practices, step by step, with real numbers and examples.' }],
    ['kw-subheading', { content: good.content.replace('Why dental automation pays', 'Why it pays') }],
    ['title-length', { title: 'Dental automation' }],
    ['description-length', { metaDescription: 'Dental automation, short.' }],
    ['image-alt', { content: `${good.content}<img src="/y.png">` }],
    ['internal-links', { content: good.content.replace('<a href="/contact">contact us</a>', 'contact us') }],
    ['length', { content: '<p>Dental automation is short.</p><h2>Dental automation</h2>' }],
    ['readability', { content: `<p>Dental automation ${words(320)}.</p>` }],
    ['faq', { faqs: [{ q: 'Only one?', a: 'Yes.' }] }],
    ['takeaways', { keyTakeaways: [] }],
    ['sources', { sources: [] }],
    ['author-bio', { authorHasBio: false }],
    ['unique-title', { title: 'Another Post' }],
  ] as const)('%s fails when its rule is broken', (id, input) => {
    expect(check(input as Partial<ScoreInput>, id).pass).toBe(false);
  });

  it('uses the meta title/description when set, else the title/short description', () => {
    expect(check({ metaTitle: 'Dental automation that pays for itself fast' }, 'title-length').pass).toBe(true);
    expect(check({ metaDescription: '' }, 'description-length').pass).toBe(false); // short description is too short
  });
});

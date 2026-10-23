// Advisory SEO/AEO/GEO checklist for the post editor (spec 6.4). Pure: runs live in the browser and never
// blocks publishing. Thresholds follow common Yoast/Rank Math conventions.
import { toSlug } from '@/lib/slug';

export type ScoreInput = {
  title: string;
  slug: string;
  focusKeyword: string;
  metaTitle: string;
  metaDescription: string;
  shortDescription: string;
  content: string;
  featuredImage: string;
  imageAltText: string;
  faqs: { q: string; a: string }[];
  keyTakeaways: string[];
  sources: { title: string; url: string }[];
  authorHasBio: boolean;
};
export type ScoreContext = { otherTitles: string[]; otherDescriptions: string[] };
export type ScoreCheck = { id: string; group: 'Keyword' | 'Search snippet' | 'Content' | 'Answers & citations'; label: string; pass: boolean; hint: string };

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
const has = (hay: string, needle: string) => needle !== '' && hay.toLowerCase().includes(needle.toLowerCase());
const norm = (s: string) => s.trim().toLowerCase();

export function scorePost(p: ScoreInput, ctx: ScoreContext): { score: number; checks: ScoreCheck[] } {
  const kw = p.focusKeyword.trim();
  const body = text(p.content);
  const words = body ? body.split(' ') : [];
  const title = p.metaTitle.trim() || p.title.trim();
  const description = p.metaDescription.trim() || p.shortDescription.trim();
  const subheadings = [...p.content.matchAll(/<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/gi)].map((m) => text(m[1]));
  const images = [...p.content.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
  const internalLinks = [...p.content.matchAll(/<a\b[^>]*href="(\/(?!\/)[^"]*)"/gi)].length;
  const sentences = body.split(/[.!?]+\s/).filter((s) => s.trim());
  const avgSentence = sentences.length ? words.length / sentences.length : 0;
  const paragraphs = [...p.content.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map((m) => text(m[1]).split(' ').length);
  const longParagraphs = paragraphs.filter((n) => n > 300).length;

  const checks: ScoreCheck[] = [
    { id: 'kw-set', group: 'Keyword', label: 'Focus keyword is set', pass: kw !== '', hint: 'Pick the one search phrase this post should rank for.' },
    { id: 'kw-title', group: 'Keyword', label: 'Keyword in the title', pass: has(title, kw) || has(p.title, kw), hint: 'Put the focus keyword in the title, ideally near the start.' },
    { id: 'kw-slug', group: 'Keyword', label: 'Keyword in the address', pass: kw !== '' && p.slug.includes(toSlug(kw)), hint: 'Include the keyword in the slug (only possible before publishing).' },
    { id: 'kw-intro', group: 'Keyword', label: 'Keyword in the first 100 words', pass: has(words.slice(0, 100).join(' '), kw), hint: 'Mention the keyword early in the introduction.' },
    { id: 'kw-description', group: 'Keyword', label: 'Keyword in the meta description', pass: has(description, kw), hint: 'Use the keyword in the description shown on Google.' },
    { id: 'kw-subheading', group: 'Keyword', label: 'Keyword in a subheading', pass: subheadings.some((h) => has(h, kw)), hint: 'Use the keyword (or a close variant) in at least one H2/H3.' },
    { id: 'title-length', group: 'Search snippet', label: 'Title is 30–60 characters', pass: title.length >= 30 && title.length <= 60, hint: `Currently ${title.length}. Longer titles get cut off on Google.` },
    { id: 'description-length', group: 'Search snippet', label: 'Description is 70–160 characters', pass: description.length >= 70 && description.length <= 160, hint: `Currently ${description.length}.` },
    { id: 'unique-title', group: 'Search snippet', label: 'Title is unique on the site', pass: !ctx.otherTitles.some((t) => norm(t) === norm(title) || norm(t) === norm(p.title)), hint: 'Another post or page already uses this title.' },
    { id: 'unique-description', group: 'Search snippet', label: 'Description is unique on the site', pass: description === '' || !ctx.otherDescriptions.some((d) => norm(d) === norm(description)), hint: 'Another post or page already uses this description.' },
    { id: 'length', group: 'Content', label: 'At least 300 words', pass: words.length >= 300, hint: `Currently ${words.length} words.` },
    { id: 'readability', group: 'Content', label: 'Easy to read', pass: avgSentence <= 25 && longParagraphs === 0, hint: 'Keep sentences under ~20 words on average and break up very long paragraphs.' },
    { id: 'internal-links', group: 'Content', label: 'At least 2 links to other pages on the site', pass: internalLinks >= 2, hint: `Currently ${internalLinks}. Link to related services and posts.` },
    { id: 'image-alt', group: 'Content', label: 'Every image has alt text', pass: images.every((i) => /\balt="[^"]+"/i.test(i)) && (!p.featuredImage || p.imageAltText.trim() !== ''), hint: 'Describe each image for screen readers and image search.' },
    { id: 'faq', group: 'Answers & citations', label: 'At least 2 FAQs', pass: p.faqs.filter((f) => f.q.trim() && f.a.trim()).length >= 2, hint: 'FAQs help Google and AI assistants quote your answers.' },
    { id: 'takeaways', group: 'Answers & citations', label: 'Key takeaways', pass: p.keyTakeaways.some((t) => t.trim()), hint: 'A short summary AI answer engines can lift directly.' },
    { id: 'sources', group: 'Answers & citations', label: 'Sources cited', pass: p.sources.some((s) => s.url.trim()), hint: 'Cite reputable sources so generative engines trust and cite you.' },
    { id: 'author-bio', group: 'Answers & citations', label: 'Author has a bio', pass: p.authorHasBio, hint: 'Pick an author with a bio (Profile screen) to show expertise.' },
  ];
  return { score: Math.round((checks.filter((c) => c.pass).length / checks.length) * 100), checks };
}

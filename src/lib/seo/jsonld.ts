import type { PublishedPage } from '@/lib/content/pages';
import type { PostAuthor, PublicPost } from '@/lib/content/posts';
import type { SiteSettings } from '@/lib/content/settings';
import { canonicalUrl, pageDescription, pagePath, plainText } from './metadata';

export type LdNode = Record<string, unknown> & { '@type': string };

const orgId = () => `${canonicalUrl('/')}#organization`;
const absolute = (href: string) => (href.startsWith('/') ? canonicalUrl(href) : href);

function postalAddress(s: SiteSettings) {
  const a = s.organization.address;
  if (!a.street || !a.city || !a.region || !a.postalCode) return null;
  return { '@type': 'PostalAddress', streetAddress: a.street, addressLocality: a.city, addressRegion: a.region, postalCode: a.postalCode, addressCountry: a.country };
}

export function organizationLd(s: SiteSettings): LdNode {
  const o = s.organization;
  return {
    '@type': 'Organization',
    '@id': orgId(),
    name: o.name,
    ...(o.legalName && { legalName: o.legalName }),
    url: canonicalUrl('/'),
    logo: absolute(s.logo),
    ...(o.description && { description: o.description }),
    ...(o.email && { email: o.email }),
    ...(o.phone && { telephone: o.phone }),
    ...(postalAddress(s) && { address: postalAddress(s) }),
    ...(o.offices.length > 0 && { location: o.offices.map(officeLd) }),
    sameAs: s.social.map((x) => x.url),
  };
}

function officeLd(f: SiteSettings['organization']['offices'][number]) {
  return {
    '@type': 'Place',
    name: f.label,
    address: { '@type': 'PostalAddress', streetAddress: f.street, addressLocality: f.city, addressRegion: f.region, postalCode: f.postalCode, addressCountry: f.country },
    ...(f.phone && { telephone: f.phone }),
  };
}

export function websiteLd(s: SiteSettings): LdNode {
  return { '@type': 'WebSite', '@id': `${canonicalUrl('/')}#website`, url: canonicalUrl('/'), name: s.organization.name, inLanguage: 'en-US', publisher: { '@id': orgId() } };
}

export function localBusinessLd(s: SiteSettings): LdNode | null {
  const address = postalAddress(s);
  if (!address) return null;
  const o = s.organization;
  return {
    '@type': 'ProfessionalService',
    '@id': `${canonicalUrl('/')}#localbusiness`,
    name: o.name,
    url: canonicalUrl('/'),
    image: absolute(s.logo),
    ...(o.phone && { telephone: o.phone }),
    ...(o.email && { email: o.email }),
    address,
    ...(o.openingHours.length > 0 && { openingHours: o.openingHours }),
    parentOrganization: { '@id': orgId() },
  };
}

export function serviceLd(page: PublishedPage): LdNode {
  return {
    '@type': 'Service',
    name: page.title,
    description: pageDescription(page),
    url: canonicalUrl(pagePath(page.slug)),
    provider: { '@id': orgId() },
    areaServed: { '@type': 'Country', name: 'United States' },
  };
}

export function breadcrumbLd(page: PublishedPage): LdNode {
  const hero = page.blocks.find((b) => b.type === 'hero');
  const crumbs =
    hero?.type === 'hero' && hero.breadcrumb?.length
      ? hero.breadcrumb.map((c, i, all) => ({ name: c.label, item: c.href ? absolute(c.href) : i === all.length - 1 ? canonicalUrl(pagePath(page.slug)) : null }))
      : [
          { name: 'Home', item: canonicalUrl('/') },
          { name: page.title, item: canonicalUrl(pagePath(page.slug)) },
        ];
  return {
    '@type': 'BreadcrumbList',
    itemListElement: crumbs
      .filter((c) => c.item)
      .map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.item })),
  };
}

export function faqLd(items: { q: string; a: string }[]): LdNode | null {
  if (!items.length) return null;
  return {
    '@type': 'FAQPage',
    mainEntity: items.map((f) => ({ '@type': 'Question', name: plainText(f.q), acceptedAnswer: { '@type': 'Answer', text: plainText(f.a) } })),
  };
}

export function faqPageLd(page: PublishedPage): LdNode | null {
  return faqLd(page.blocks.flatMap((b) => (b.type === 'faq' ? b.items : [])));
}

export function breadcrumbOf(items: { name: string; path: string }[]): LdNode {
  return { '@type': 'BreadcrumbList', itemListElement: items.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: canonicalUrl(c.path) })) };
}

function personOf(a: PostAuthor) {
  return { '@type': 'Person', name: a.name, ...(a.slug && { url: canonicalUrl(`/authors/${a.slug}`) }), ...(a.sameAs.length > 0 && { sameAs: a.sameAs }) };
}

export function blogPostingLd(post: PublicPost): LdNode {
  const url = canonicalUrl(`/blog/${post.slug}`);
  const keywords = [...new Set([post.focusKeyword, ...post.secondaryKeywords, ...post.seo.keywords].filter(Boolean))];
  const words = post.content.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  return {
    '@type': 'BlogPosting',
    '@id': `${url}#article`,
    headline: post.title,
    description: post.seo.metaDescription || post.shortDescription,
    ...(post.featuredImage && { image: absolute(post.featuredImage) }),
    datePublished: post.publishedAt,
    dateModified: post.lastReviewedAt ?? post.updatedAt,
    author: post.author.slug ? personOf(post.author) : { '@id': orgId() },
    publisher: { '@id': orgId() },
    mainEntityOfPage: url,
    ...(post.category && { articleSection: post.category.name }),
    ...(keywords.length > 0 && { keywords: keywords.join(', ') }),
    wordCount: words,
    ...(post.sources.length > 0 && { citation: post.sources.map((x) => x.url) }),
    inLanguage: 'en-US',
  };
}

export function postJsonLd(post: PublicPost, s: SiteSettings): LdNode[] {
  const crumbs = [{ name: 'Home', path: '/' }, { name: 'Blog', path: '/blog' }];
  if (post.category) crumbs.push({ name: post.category.name, path: `/blog/category/${post.category.slug}` });
  crumbs.push({ name: post.title, path: `/blog/${post.slug}` });
  const nodes: (LdNode | null)[] = [organizationLd(s), websiteLd(s), blogPostingLd(post), breadcrumbOf(crumbs), faqLd(post.faqs)];
  return nodes.filter((n): n is LdNode => n !== null);
}

export function authorJsonLd(a: PostAuthor, s: SiteSettings): LdNode[] {
  return [
    organizationLd(s),
    websiteLd(s),
    { '@type': 'ProfilePage', url: canonicalUrl(`/authors/${a.slug}`), mainEntity: { ...personOf(a), ...(a.jobTitle && { jobTitle: a.jobTitle }), ...(a.bio && { description: a.bio }), ...(a.expertise.length > 0 && { knowsAbout: a.expertise }), worksFor: { '@id': orgId() } } },
    breadcrumbOf([{ name: 'Home', path: '/' }, { name: 'Blog', path: '/blog' }, { name: a.name, path: `/authors/${a.slug}` }]),
  ];
}

export function listJsonLd(s: SiteSettings, crumbs: { name: string; path: string }[]): LdNode[] {
  return [organizationLd(s), websiteLd(s), breadcrumbOf([{ name: 'Home', path: '/' }, ...crumbs])];
}

export function pageJsonLd(page: PublishedPage, s: SiteSettings): LdNode[] {
  const nodes: (LdNode | null)[] = [organizationLd(s), websiteLd(s)];
  if (page.slug === 'home' || page.slug === 'contact') nodes.push(localBusinessLd(s));
  if (page.slug !== 'home') nodes.push(breadcrumbLd(page));
  if (page.type === 'service' || page.type === 'landing') nodes.push(serviceLd(page));
  nodes.push(faqPageLd(page));
  return nodes.filter((n): n is LdNode => n !== null);
}

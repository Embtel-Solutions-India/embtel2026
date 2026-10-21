import type { PublishedPage } from '@/lib/content/pages';
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
    sameAs: s.social.map((x) => x.url),
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

export function faqPageLd(page: PublishedPage): LdNode | null {
  const items = page.blocks.flatMap((b) => (b.type === 'faq' ? b.items : []));
  if (!items.length) return null;
  return {
    '@type': 'FAQPage',
    mainEntity: items.map((f) => ({ '@type': 'Question', name: plainText(f.q), acceptedAnswer: { '@type': 'Answer', text: plainText(f.a) } })),
  };
}

export function pageJsonLd(page: PublishedPage, s: SiteSettings): LdNode[] {
  const nodes: (LdNode | null)[] = [organizationLd(s), websiteLd(s)];
  if (page.slug === 'home' || page.slug === 'contact') nodes.push(localBusinessLd(s));
  if (page.slug !== 'home') nodes.push(breadcrumbLd(page));
  if (page.type === 'service' || page.type === 'landing') nodes.push(serviceLd(page));
  nodes.push(faqPageLd(page));
  return nodes.filter((n): n is LdNode => n !== null);
}

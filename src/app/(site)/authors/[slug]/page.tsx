import type { Metadata } from 'next';
import Image from 'next/image';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { PostList } from '@/components/blog/PostList';
import { JsonLd } from '@/components/seo/JsonLd';
import { getSiteSettings } from '@/lib/content/settings';
import { authorJsonLd } from '@/lib/seo/jsonld';
import { NETWORK_LABELS } from '@/components/site/SocialIcon';
import { parsePage } from '@/lib/content/pagination';
import { getAuthor, listPublishedPosts } from '@/lib/content/posts';
import { buildListMetadata } from '@/lib/seo/metadata';

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string | string[] }> };

async function load({ params, searchParams }: Props) {
  await connection();
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const author = await getAuthor(slug);
  if (!author) notFound();
  const page = parsePage(sp.page) ?? 1;
  return { author, page, data: await listPublishedPosts({ authorSlug: slug, page }) };
}

const profileLabel = (url: string) => {
  const host = new URL(url).hostname.replace(/^www\./, '');
  if (host.includes('linkedin')) return NETWORK_LABELS.linkedin;
  if (host.includes('twitter') || host === 'x.com') return 'X';
  return host;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { author, page } = await load(props);
  return buildListMetadata({
    title: author.name,
    description: author.bio || `Articles by ${author.name} at Embtel Solutions.`,
    path: `/authors/${author.slug}`,
    page,
  });
}

export default async function AuthorPage(props: Props) {
  const [{ author, data }, settings, h] = await Promise.all([load(props), getSiteSettings(), headers()]);
  return (
    <>
      <JsonLd data={authorJsonLd(author, settings)} nonce={h.get('x-nonce') ?? undefined} />
      <section className="blog-hero">
        <div className="blog-hero-in">
          {author.avatar && <Image src={author.avatar} alt="" width={96} height={96} className="mx-auto mb-5 rounded-full" priority />}
          <p className="mb-3.5 text-[11.5px] font-bold uppercase tracking-[2px] text-ac">Author</p>
          <h1>{author.name}</h1>
          {author.jobTitle && <p className="lead !mb-3">{author.jobTitle}</p>}
          {author.bio && <p className="lead">{author.bio}</p>}
          {author.expertise.length > 0 && (
            <ul className="blog-chips" aria-label="Expertise">
              {author.expertise.map((e) => (
                <li key={e} className="blog-chip">
                  {e}
                </li>
              ))}
            </ul>
          )}
          {author.sameAs.length > 0 && (
            <ul className="blog-chips" aria-label="Profiles">
              {author.sameAs.map((url) => (
                <li key={url}>
                  <a className="blog-chip" href={url} rel="noopener me" target="_blank">
                    {profileLabel(url)}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
      <PostList data={data} basePath={`/authors/${author.slug}`} />
    </>
  );
}

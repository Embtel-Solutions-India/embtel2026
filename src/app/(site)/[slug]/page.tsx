import type { Metadata } from 'next';
import { loadPageOr404, SitePage } from '../render-page';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { page } = await loadPageOr404((await params).slug);
  return { title: page.title };
}

// `home` is served at `/`; /home is not a second copy of it.
export default async function Page({ params }: Props) {
  const { slug } = await params;
  return <SitePage slug={slug === 'home' ? '__none__' : slug} />;
}

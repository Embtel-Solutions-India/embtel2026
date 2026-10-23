import type { Metadata } from 'next';
import { pageMetadata, SitePage } from '../render-page';

type Props = { params: Promise<{ slug: string }> };

// `home` is served at `/`; /home is not a second copy of it (the proxy 404s it too).
const resolve = async (params: Props['params']) => {
  const { slug } = await params;
  return slug === 'home' ? '__none__' : slug;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return pageMetadata(await resolve(params));
}

export default async function Page({ params }: Props) {
  return <SitePage slug={await resolve(params)} />;
}

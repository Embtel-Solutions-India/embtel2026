import type { Metadata } from 'next';
import { loadPageOr404, SitePage } from './render-page';

export async function generateMetadata(): Promise<Metadata> {
  const { page } = await loadPageOr404('home');
  return { title: page.title };
}

export default function Home() {
  return <SitePage slug="home" />;
}

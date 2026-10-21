import type { Metadata } from 'next';
import { pageMetadata, SitePage } from './render-page';

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata('home');
}

export default function Home() {
  return <SitePage slug="home" />;
}

import { connection } from 'next/server';
import { getPublishedPage } from '@/lib/content/pages';
import { OG_EYEBROW, renderOgImage } from '@/lib/seo/og';

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  await connection();
  const page = await getPublishedPage((await params).slug).catch(() => null);
  // Unknown slug → the default card, never an error.
  return renderOgImage(page ? { title: page.title, eyebrow: OG_EYEBROW[page.type] } : { title: 'Technology & Automation for Growing Businesses' });
}

import { renderOgImage } from '@/lib/seo/og';

// Default social card (home and fallback). A route handler, not the opengraph-image file
// convention, so Next doesn't inject a second og:image next to buildPageMetadata's.
export async function GET() {
  return renderOgImage({ title: 'Technology & Automation for Growing Businesses' });
}

import type { Metadata } from 'next';
import NotFound from '../not-found';

// Rewrite target for unknown slugs (src/proxy.ts sets the 404 status).
export const metadata: Metadata = { title: 'Page not found — Embtel Solutions', robots: { index: false } };

export default NotFound;

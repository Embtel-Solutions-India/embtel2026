import type { AdminPost } from './posts';

// Plain module (not 'use client') so server pages can spread these defaults.
export type PostFormValue = Omit<AdminPost, 'id' | 'updatedAt' | 'isDeleted' | 'publishedAt'>;

export const EMPTY_POST: PostFormValue = {
  title: '',
  slug: '',
  shortDescription: '',
  content: '',
  featuredImage: '',
  imageAltText: '',
  category: null,
  tags: [],
  authorId: null,
  authorName: '',
  status: 'draft',
  scheduledAt: null,
  pinned: false,
  faqs: [],
  keyTakeaways: [],
  sources: [],
  focusKeyword: '',
  secondaryKeywords: [],
  seo: { metaTitle: '', metaDescription: '', keywords: [], canonicalUrl: '', ogImage: '', noindex: false },
  lastReviewedAt: null,
};


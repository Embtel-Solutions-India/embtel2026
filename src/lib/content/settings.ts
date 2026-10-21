import { cacheLife, cacheTag } from 'next/cache';
import { z } from 'zod';
import { connectDB } from '@/lib/db/connect';
import { Settings } from '@/lib/db/models/Settings';
import { HrefSchema, HttpsUrlSchema, LinkSchema } from './links';

export const SETTINGS_TAG = 'settings';

const NavChildSchema = z.object({ label: z.string().min(1), subtitle: z.string().optional(), href: HrefSchema });
const NavItemSchema = z.object({ label: z.string().min(1), href: HrefSchema, children: z.array(NavChildSchema).optional() });
export type NavItem = z.infer<typeof NavItemSchema>;

const FIELDS = {
  organization: z.object({
    name: z.string().min(1),
    legalName: z.string().default(''),
    email: z.string().default(''),
    phone: z.string().default(''),
    phoneDisplay: z.string().default(''),
    address: z
      .object({
        street: z.string().default(''),
        city: z.string().default(''),
        region: z.string().default(''),
        postalCode: z.string().default(''),
        country: z.literal('US').default('US'),
      })
      .default({}),
    openingHours: z.array(z.string()).default([]),
    description: z.string().default(''),
  }),
  // Internal paths only until the media host is added to images.remotePatterns (Phase 4).
  logo: z.string().regex(/^\/(?!\/)/),
  headerNav: z.array(NavItemSchema),
  headerCta: LinkSchema.nullable(),
  footer: z.object({
    description: z.string().default(''),
    columns: z.array(z.object({ title: z.string(), links: z.array(LinkSchema) })).default([]),
    copyright: z.string().default(''),
    legalLinks: z.array(LinkSchema).default([]),
  }),
  social: z.array(z.object({ network: z.enum(['facebook', 'instagram', 'linkedin', 'x']), url: HttpsUrlSchema })),
  whatsapp: z.object({ number: z.string().regex(/^\d{7,15}$/), message: z.string().max(500) }).nullable(),
  integrations: z.object({
    googleAdsId: z.string().regex(/^(AW-\d+)?$/).default(''),
    elfsightReviewsAppId: z.string().regex(/^([0-9a-f-]{36})?$/).default(''),
  }),
  defaultOgImage: z.string().default(''),
};

export const SiteSettingsSchema = z.object(FIELDS);

export const isValidSettingsField = (field: string, value: unknown) =>
  field in FIELDS && FIELDS[field as keyof typeof FIELDS].safeParse(value).success;
export type SiteSettings = z.infer<typeof SiteSettingsSchema>;

export const DEFAULT_SETTINGS: SiteSettings = SiteSettingsSchema.parse({
  organization: { name: 'Embtel Solutions' },
  logo: '/images/logo.png',
  headerNav: [],
  headerCta: null,
  footer: {},
  social: [],
  whatsapp: null,
  integrations: {},
  defaultOgImage: '',
});

// Uncached loader (tests call this). Each field is validated on its own so one bad field
// falls back to its default instead of taking the header/footer down.
export async function loadSiteSettings(): Promise<SiteSettings> {
  await connectDB();
  const doc = (await Settings.findOne({ key: 'site' }).lean()) as Record<string, unknown> | null;
  const out: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const [field, schema] of Object.entries(FIELDS)) {
    if (doc?.[field] === undefined) continue;
    const parsed = schema.safeParse(doc[field]);
    if (parsed.success) out[field] = parsed.data;
    else console.error('[settings] invalid field, using default:', field);
  }
  return out as SiteSettings;
}

export async function getSiteSettings(): Promise<SiteSettings> {
  'use cache';
  cacheTag(SETTINGS_TAG);
  cacheLife('max');
  return loadSiteSettings();
}

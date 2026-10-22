import { cacheLife, cacheTag } from 'next/cache';
import { z } from 'zod';
import { connectDB } from '@/lib/db/connect';
import { Settings } from '@/lib/db/models/Settings';
import { isAllowedImageUrl } from './image-hosts';
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
    // Further offices (e.g. India) besides the primary US address; shown in the footer and JSON-LD.
    offices: z
      .array(
        z.object({
          label: z.string().trim().min(1).max(60),
          street: z.string().max(200).default(''),
          city: z.string().max(100).default(''),
          region: z.string().max(100).default(''),
          postalCode: z.string().max(20).default(''),
          country: z.enum(['US', 'IN']),
          phone: z.string().max(30).default(''),
        }),
      )
      .max(5)
      .default([]),
    description: z.string().default(''),
  }),
  // Internal path or an allowed media host (same list as images.remotePatterns).
  logo: z.string().refine(isAllowedImageUrl),
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
    // Ads conversion label for lead submissions (the part after the slash in send_to).
    googleAdsConversionLabel: z.string().regex(/^([A-Za-z0-9_-]{4,40})?$/).default(''),
    ga4Id: z.string().regex(/^(G-[A-Z0-9]{4,20})?$/).default(''),
    gtmId: z.string().regex(/^(GTM-[A-Z0-9]{4,12})?$/).default(''),
    // Search Console HTML-tag verification token (content of the google-site-verification meta tag).
    gscVerification: z.string().regex(/^([A-Za-z0-9_-]{10,100})?$/).default(''),
    tawkPropertyId: z.string().regex(/^([a-f0-9]{24})?$/).default(''),
    tawkWidgetId: z.string().regex(/^([a-z0-9]{6,20})?$/).default(''),
    elfsightReviewsAppId: z.string().regex(/^([0-9a-f-]{36})?$/).default(''),
    // Public form ID (it appears in the form's URL); leads are forwarded here so Formspree emails the team.
    formspreeFormId: z.string().regex(/^([A-Za-z0-9]{6,20})?$/).default(''),
  }),
  defaultOgImage: z.string().default(''),
};

export const SiteSettingsSchema = z.object(FIELDS);

export const isValidSettingsField = (field: string, value: unknown) =>
  field in FIELDS && FIELDS[field as keyof typeof FIELDS].safeParse(value).success;
export type SettingsField = keyof typeof FIELDS;
export const settingsFieldSchema = (field: SettingsField) => FIELDS[field];
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

import { z } from 'zod';

// Link targets content may use: internal paths, https, tel:, mailto:. Never javascript:/data:/protocol-relative.
export const HrefSchema = z
  .string()
  .max(2000)
  .regex(/^(\/(?!\/)|https:\/\/|tel:|mailto:)/, 'href must be an internal path, https, tel or mailto');

export const HttpsUrlSchema = z.string().max(2000).regex(/^https:\/\//, 'must be an https URL');

export const LinkSchema = z.object({ label: z.string().min(1).max(200), href: HrefSchema });
export type Link = z.infer<typeof LinkSchema>;

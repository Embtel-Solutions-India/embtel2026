import { isValidObjectId } from 'mongoose';
import { connectDB } from '@/lib/db/connect';
import { Lead } from '@/lib/db/models/Lead';
import { forwardLead } from '@/lib/leads/submit';
import { UserFacingError } from './action';

const PER_PAGE = 30;
export const FORWARD_STATUSES = ['sent', 'failed', 'skipped', 'pending'] as const;
type Raw = Record<string, unknown>;

export type LeadRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  businessName: string;
  service: string;
  message: string;
  smsConsent: boolean;
  smsConsentNote: string; // when and under which wording version, for leads that opted in
  sourcePage: string;
  utm: Record<string, string>;
  gclid: string;
  forwardStatus: string;
  forwardError: string;
  createdAt: string;
};

const toRow = (d: Raw): LeadRow => ({
  id: String(d._id),
  name: `${d.firstName ?? ''} ${d.lastName ?? ''}`.trim(),
  email: String(d.email ?? ''),
  phone: String(d.phone ?? ''),
  businessName: String(d.businessName ?? ''),
  service: String(d.service ?? ''),
  message: String(d.message ?? ''),
  smsConsent: Boolean(d.smsConsent),
  smsConsentNote: d.smsConsentAt instanceof Date ? `${d.smsConsentAt.toISOString()} (${String(d.smsConsentVersion ?? '')})` : '',
  sourcePage: String(d.sourcePage ?? ''),
  utm: Object.fromEntries(Object.entries((d.utm as Record<string, unknown>) ?? {}).filter(([, v]) => v).map(([k, v]) => [k, String(v)])),
  gclid: String(d.gclid ?? ''),
  forwardStatus: String(d.forwardStatus ?? 'pending'),
  forwardError: String(d.forwardError ?? ''),
  createdAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : '',
});

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function filterOf(opts: { status?: string; q?: string }) {
  const filter: Raw = {};
  if (opts.status && (FORWARD_STATUSES as readonly string[]).includes(opts.status)) filter.forwardStatus = opts.status;
  if (opts.q?.trim()) {
    const rx = { $regex: escapeRegex(opts.q.trim().slice(0, 100)), $options: 'i' };
    filter.$or = [{ email: rx }, { firstName: rx }, { lastName: rx }, { businessName: rx }];
  }
  return filter;
}

export async function listLeads(opts: { status?: string; q?: string; page?: number }): Promise<{ items: LeadRow[]; page: number; pages: number; total: number }> {
  await connectDB();
  const filter = filterOf(opts);
  const page = Math.min(1000, Math.max(1, Math.floor(opts.page ?? 1) || 1));
  const [total, docs] = await Promise.all([Lead.countDocuments(filter), Lead.find(filter).sort({ createdAt: -1 }).skip((page - 1) * PER_PAGE).limit(PER_PAGE).lean<Raw[]>()]);
  return { items: docs.map(toRow), page, pages: Math.ceil(total / PER_PAGE), total };
}

async function findLead(id: string) {
  if (!isValidObjectId(id)) throw new UserFacingError('This lead no longer exists.');
  await connectDB();
  const d = await Lead.findById(id).lean<Raw>();
  if (!d) throw new UserFacingError('This lead no longer exists.');
  return d;
}

export async function retryForward(id: string): Promise<string> {
  return forwardLead((await findLead(id)) as { _id: unknown } & Raw);
}

export async function deleteLead(id: string): Promise<void> {
  const d = await findLead(id);
  await Lead.deleteOne({ _id: d._id });
}

// RFC 4180 quoting, plus a leading ' on cells a spreadsheet would treat as a formula (CSV injection).
const cell = (v: unknown) => {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

export async function leadsCsv(opts: { status?: string; q?: string } = {}): Promise<string> {
  await connectDB();
  const docs = await Lead.find(filterOf(opts)).sort({ createdAt: -1 }).limit(10_000).lean<Raw[]>();
  const head = ['Date', 'First name', 'Last name', 'Email', 'Phone', 'Business', 'Service', 'Message', 'SMS consent', 'SMS consent at', 'SMS consent version', 'Source page', 'UTM source', 'UTM medium', 'UTM campaign', 'gclid', 'Formspree'];
  const rows = docs.map((d) => {
    const utm = (d.utm as Record<string, unknown>) ?? {};
    return [d.createdAt instanceof Date ? d.createdAt.toISOString() : '', d.firstName, d.lastName, d.email, d.phone, d.businessName, d.service, d.message, d.smsConsent ? 'yes' : 'no', d.smsConsentAt instanceof Date ? d.smsConsentAt.toISOString() : '', d.smsConsentVersion, d.sourcePage, utm.source, utm.medium, utm.campaign, d.gclid, d.forwardStatus];
  });
  return [head, ...rows].map((r) => r.map(cell).join(',')).join('\r\n');
}

export async function getLead(id: string): Promise<LeadRow | null> {
  if (!isValidObjectId(id)) return null;
  await connectDB();
  const d = await Lead.findById(id).lean<Raw>();
  return d ? toRow(d) : null;
}

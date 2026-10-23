import { isValidObjectId } from 'mongoose';
import { connectDB } from '@/lib/db/connect';
import { Blog } from '@/lib/db/models/Blog';
import { Lead } from '@/lib/db/models/Lead';
import { loadSiteSettings } from '@/lib/content/settings';
import { listAudit } from './audit';

type Row = { _id: unknown; title: string; status?: string; scheduledAt?: Date; updatedAt?: Date };
type Raw = Record<string, unknown>;
const LIVE = { isDeleted: { $ne: true } };
const iso = (d: unknown) => (d instanceof Date ? d.toISOString() : '');

// Everything the dashboard shows, in one round of queries. `viewer` adds the personal and role-specific parts
// (my drafts for everyone; team activity and integration status for Admins only).
export async function loadDashboard(viewer?: { userId: string; isAdmin: boolean }) {
  await connectDB();
  const weekAgo = new Date(Date.now() - 7 * 86_400_000);
  const mine = viewer && isValidObjectId(viewer.userId) ? viewer.userId : null;
  const [published, scheduled, draft, trashed, upcoming, recent, leadsWeek, leadsFailed, recentLeads, seoGaps, myDrafts] = await Promise.all([
    Blog.countDocuments({ ...LIVE, status: 'published' }),
    Blog.countDocuments({ ...LIVE, status: 'scheduled' }),
    Blog.countDocuments({ ...LIVE, status: 'draft' }),
    Blog.countDocuments({ isDeleted: true }),
    Blog.find({ status: 'scheduled' }, { title: 1, scheduledAt: 1 }).sort({ scheduledAt: 1 }).limit(5).lean<Row[]>(),
    Blog.find({}, { title: 1, status: 1, updatedAt: 1 }).sort({ updatedAt: -1 }).limit(5).lean<Row[]>(),
    Lead.countDocuments({ createdAt: { $gte: weekAgo } }),
    Lead.countDocuments({ forwardStatus: 'failed' }),
    Lead.find({}, { firstName: 1, lastName: 1, service: 1, forwardStatus: 1, createdAt: 1 }).sort({ createdAt: -1 }).limit(5).lean<Raw[]>(),
    // Published posts missing the basics answer engines use (a focus keyword, at least two FAQs).
    Blog.find({ ...LIVE, status: 'published', $or: [{ focusKeyword: { $in: ['', null] } }, { focusKeyword: { $exists: false } }, { 'faqs.1': { $exists: false } }] }, { title: 1 })
      .sort({ publishedAt: -1 })
      .limit(5)
      .lean<Row[]>(),
    mine ? Blog.find({ ...LIVE, status: 'draft', author: mine }, { title: 1, updatedAt: 1 }).sort({ updatedAt: -1 }).limit(5).lean<Row[]>() : Promise.resolve([] as Row[]),
  ]);

  let admin: { activity: Awaited<ReturnType<typeof listAudit>>['items']; integrations: { name: string; on: boolean }[] } | undefined;
  if (viewer?.isAdmin) {
    const [audit, settings] = await Promise.all([listAudit({}), loadSiteSettings()]);
    const i = settings.integrations;
    admin = {
      activity: audit.items.slice(0, 6),
      integrations: [
        { name: 'Google Ads', on: Boolean(i.googleAdsId) },
        { name: 'Formspree', on: Boolean(i.formspreeFormId) },
        { name: 'GA4', on: Boolean(i.ga4Id) },
        { name: 'Tag Manager', on: Boolean(i.gtmId) },
        { name: 'Search Console', on: Boolean(i.gscVerification) },
        { name: 'Tawk.to chat', on: Boolean(i.tawkPropertyId && i.tawkWidgetId) },
      ],
    };
  }

  return {
    counts: { published, scheduled, draft, trashed },
    upcoming: upcoming.map((p) => ({ id: String(p._id), title: p.title, scheduledAt: iso(p.scheduledAt) })),
    recent: recent.map((p) => ({ id: String(p._id), title: p.title, status: p.status ?? 'draft', updatedAt: iso(p.updatedAt) })),
    leads: {
      last7Days: leadsWeek,
      failed: leadsFailed,
      recent: recentLeads.map((l) => ({ id: String(l._id), name: `${l.firstName ?? ''} ${l.lastName ?? ''}`.trim(), service: String(l.service ?? ''), status: String(l.forwardStatus ?? ''), createdAt: iso(l.createdAt) })),
    },
    seoGaps: seoGaps.map((p) => ({ id: String(p._id), title: p.title })),
    myDrafts: myDrafts.map((p) => ({ id: String(p._id), title: p.title, updatedAt: iso(p.updatedAt) })),
    activity: admin?.activity,
    integrations: admin?.integrations,
  };
}

import { leadsCsv } from '@/lib/admin/leads';
import { audit } from '@/lib/audit';
import { getCurrentUser } from '@/lib/auth/session';
import { can, normalizeRole } from '@/lib/auth/permissions';

// CSV download (Admin: leads.export). A GET that changes nothing, so no CSRF token is needed;
// the session and permission are checked here (the proxy only checks that a session exists).
export async function GET(req: Request) {
  const user = await getCurrentUser();
  let allowed = false;
  try {
    allowed = Boolean(user) && can(normalizeRole(user!.role), 'leads.export');
  } catch {
    allowed = false;
  }
  if (!user || !allowed) return new Response('Forbidden', { status: 403 });
  const url = new URL(req.url);
  const csv = await leadsCsv({ status: url.searchParams.get('status') ?? undefined, q: url.searchParams.get('q') ?? undefined });
  await audit({ actorId: String(user._id), action: 'lead.export', target: { type: 'lead' } });
  const date = new Date().toISOString().slice(0, 10);
  return new Response(`﻿${csv}`, {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="embtel-leads-${date}.csv"`, 'Cache-Control': 'no-store' },
  });
}

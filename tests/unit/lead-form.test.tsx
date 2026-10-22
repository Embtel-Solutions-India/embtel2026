// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const submit = vi.fn();
vi.mock('@/components/leads/actions', () => ({ submitLeadAction: (...a: unknown[]) => submit(...a) }));
vi.mock('next/link', () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));

import { LeadForm } from '@/components/leads/LeadForm';

afterEach(() => {
  cleanup();
  submit.mockReset();
  delete (window as { dataLayer?: unknown }).dataLayer;
});
const send = () => fireEvent.submit(screen.getByRole('form', { name: 'Contact form' }));

describe('LeadForm', () => {
  it('recovers with a helpful message when the server action fails', async () => {
    submit.mockRejectedValue(new Error('network'));
    render(<LeadForm adsId="" adsLabel="" ga4Id="" gtmId="" email="info@example.com" />);
    send();
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('info@example.com'));
    expect((screen.getByRole('button', { name: /Send Message/ }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('tells Google Tag Manager about the lead when GTM is the only tag', async () => {
    submit.mockResolvedValue({ ok: true });
    render(<LeadForm adsId="" adsLabel="" ga4Id="" gtmId="GTM-ABCD12" email="" />);
    send();
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Message Sent!'));
    expect((window as unknown as { dataLayer: unknown[] }).dataLayer).toContainEqual({ event: 'generate_lead', form: 'contact' });
  });
});

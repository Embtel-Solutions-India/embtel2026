import nodemailer, { type Transporter } from 'nodemailer';

// Outgoing email over the SMTP server in env (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM).
// Read at call time; when SMTP isn't configured it reports that instead of failing. Never logs message content.
export type Mail = { to: string; subject: string; text: string; html: string };
export type MailResult = { sent: true } | { sent: false; reason: 'not-configured' | 'failed' };

let transport: { key: string; t: Transporter } | null = null;

export async function sendMail(m: Mail): Promise<MailResult> {
  const { SMTP_HOST: host, SMTP_PORT, SMTP_USER: user, SMTP_PASS: pass, SMTP_FROM: from } = process.env;
  if (!host || !from) return { sent: false, reason: 'not-configured' };
  const port = Number(SMTP_PORT) || 587;
  const key = `${host}:${port}:${user ?? ''}`;
  if (transport?.key !== key) {
    transport = { key, t: nodemailer.createTransport({ host, port, secure: port === 465, auth: user && pass ? { user, pass } : undefined, connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 15_000 }) };
  }
  try {
    await transport.t.sendMail({ from, to: m.to, subject: m.subject, text: m.text, html: m.html });
    return { sent: true };
  } catch (e) {
    console.error('[mail] send failed:', e instanceof Error ? e.message.replace(/\S+@\S+/g, '<address>') : 'unknown error');
    return { sent: false, reason: 'failed' };
  }
}

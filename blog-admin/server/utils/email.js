const env = require('../config/env');

// Sends transactional email via SMTP if configured; otherwise logs the message
// to the console so password-reset flows are still testable in dev without SMTP.
async function sendEmail({ to, subject, html }) {
  if (!env.smtp.host) {
    console.log('\n[email:dev] SMTP not configured — logging email instead of sending:');
    console.log(`  To: ${to}\n  Subject: ${subject}\n  Body:\n${html}\n`);
    return;
  }

  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.port === 465,
    auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
  });

  await transporter.sendMail({ from: env.smtp.from, to, subject, html });
}

module.exports = sendEmail;

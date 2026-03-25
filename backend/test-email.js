/**
 * Quick email test script.
 * Run from the backend directory:  node test-email.js your@email.com
 */
require('dotenv').config({ path: './.env' });

const nodemailer = require('nodemailer');

const to = process.argv[2];
if (!to) {
  console.error('Usage: node test-email.js your@email.com');
  process.exit(1);
}

const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, EMAIL_FROM } = process.env;

if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
  console.error('SMTP not configured in .env — check SMTP_HOST, SMTP_USER, SMTP_PASS');
  process.exit(1);
}

const transport = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT || 587),
  secure: SMTP_SECURE === 'true',
  auth: { user: SMTP_USER, pass: SMTP_PASS },
});

async function run() {
  console.log(`Sending test email to: ${to}`);
  console.log(`SMTP: ${SMTP_HOST}:${SMTP_PORT} (secure=${SMTP_SECURE})`);

  try {
    await transport.verify();
    console.log('✓ SMTP connection OK');
  } catch (err) {
    console.error('✗ SMTP connection failed:', err.message);
    process.exit(1);
  }

  try {
    await transport.sendMail({
      from: EMAIL_FROM || 'SwingStakes <noreply@swingstakes.co.in>',
      to,
      subject: '✅ SwingStakes email test',
      html: `<div style="font-family:sans-serif;background:#0d1117;color:#e2e8f0;padding:32px;border-radius:12px">
        <h2 style="color:#34d399">SwingStakes Email Test</h2>
        <p>If you're reading this, your SMTP configuration is working correctly.</p>
        <p style="color:#64748b;font-size:12px">Sent at ${new Date().toISOString()}</p>
      </div>`,
      text: `SwingStakes email test — SMTP is working. Sent at ${new Date().toISOString()}`,
    });
    console.log(`✓ Email sent successfully to ${to}`);
    console.log('  Check your inbox (and spam folder)');
  } catch (err) {
    console.error('✗ Failed to send email:', err.message);
  }
}

run();

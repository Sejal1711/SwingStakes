const nodemailer = require('nodemailer');

// ─── Transport ────────────────────────────────────────────────────────────────
// Set SMTP_* env vars in production (e.g. SendGrid, Mailgun, Gmail).
// If not configured, email is disabled and logged to console in dev.
const isConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

const transport = isConfigured
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;

const FROM = process.env.EMAIL_FROM || 'SwingStakes <noreply@swingstakes.co.in>';
const APP_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// ─── Core send helper ─────────────────────────────────────────────────────────
async function sendMail({ to, subject, html, text }) {
  if (!to) return;
  if (!transport) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[email:dev] To: ${to} | Subject: ${subject}`);
    }
    return;
  }
  try {
    await transport.sendMail({ from: FROM, to, subject, html, text });
  } catch (err) {
    console.error('[email] Failed to send:', err.message);
  }
}

// ─── Shared HTML wrapper ──────────────────────────────────────────────────────
function wrap(body) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body{margin:0;padding:0;background:#0d1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e2e8f0}
  .container{max-width:600px;margin:40px auto;background:#111827;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.08)}
  .header{background:linear-gradient(135deg,#10b981,#059669);padding:32px 40px}
  .header h1{margin:0;color:#fff;font-size:22px;font-weight:700}
  .header p{margin:4px 0 0;color:rgba(255,255,255,0.8);font-size:14px}
  .body{padding:32px 40px}
  .body p{margin:0 0 16px;line-height:1.6;color:#cbd5e1}
  .highlight{background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.25);border-radius:12px;padding:16px 20px;margin:20px 0}
  .highlight p{margin:0;color:#34d399}
  .btn{display:inline-block;background:#10b981;color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:600;font-size:15px;margin:8px 0}
  .footer{padding:20px 40px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;font-size:12px;color:#475569}
</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>SwingStakes</h1>
      <p>Play. Give. Win.</p>
    </div>
    <div class="body">${body}</div>
    <div class="footer">© ${new Date().getFullYear()} SwingStakes · <a href="${APP_URL}" style="color:#10b981;text-decoration:none">swingstakes.co.in</a></div>
  </div>
</body>
</html>`;
}

// ─── Email Templates ──────────────────────────────────────────────────────────

/**
 * Notify a winner that draw results have been published.
 * @param {object} opts
 * @param {string} opts.to          - recipient email
 * @param {string} opts.username    - display name
 * @param {string} opts.monthYear   - e.g. "2026-03"
 * @param {number} opts.matchType   - 3, 4, or 5
 * @param {number} opts.prizeAmount - prize in GBP
 */
async function sendWinnerAlert({ to, username, monthYear, matchType, prizeAmount }) {
  const currency = process.env.CURRENCY_SYMBOL || '£';
  await sendMail({
    to,
    subject: `🏆 You won £${Number(prizeAmount).toFixed(2)} in the ${monthYear} Draw!`,
    html: wrap(`
      <p>Hi <strong>${username}</strong>,</p>
      <p>Congratulations — you matched <strong>${matchType} numbers</strong> in the <strong>${monthYear}</strong> SwingStakes draw!</p>
      <div class="highlight">
        <p><strong>Prize: ${currency}${Number(prizeAmount).toFixed(2)}</strong></p>
      </div>
      <p>To claim your prize, you need to submit proof of your golf scores. Log into your dashboard and go to <strong>My Winnings</strong> to upload a screenshot from your golf platform.</p>
      <a href="${APP_URL}/dashboard" class="btn">Claim Your Prize →</a>
      <p>If you have any questions, reply to this email and our team will help.</p>
      <p>Well played!</p>
    `),
    text: `Congratulations ${username}! You matched ${matchType} numbers in the ${monthYear} draw and won ${currency}${Number(prizeAmount).toFixed(2)}. Visit ${APP_URL}/dashboard to claim your prize.`,
  });
}

/**
 * Notify all draw participants that results are published.
 * @param {object} opts
 * @param {string} opts.to          - recipient email
 * @param {string} opts.username    - display name
 * @param {string} opts.monthYear   - draw month
 * @param {number|null} opts.matchCount - user's match count (null if no picks)
 */
async function sendDrawResultsNotification({ to, username, monthYear, matchCount }) {
  const matched = matchCount != null && matchCount >= 3;
  const subject = matched
    ? `🎯 Your ${monthYear} draw results — ${matchCount} matches!`
    : `📋 ${monthYear} draw results published`;

  const bodyContent = matched
    ? `<p>Hi <strong>${username}</strong>,</p>
       <p>The <strong>${monthYear}</strong> draw results are in — and you matched <strong>${matchCount} numbers</strong>!</p>
       <div class="highlight"><p>You may be eligible for a prize. Check your dashboard to see your result and submit proof if required.</p></div>
       <a href="${APP_URL}/dashboard" class="btn">View My Results →</a>`
    : `<p>Hi <strong>${username}</strong>,</p>
       <p>The <strong>${monthYear}</strong> draw has been completed. Unfortunately you didn't have a winning match this month, but keep playing — there's always next month!</p>
       <a href="${APP_URL}/prizes" class="btn">View Draw Results →</a>`;

  await sendMail({
    to,
    subject,
    html: wrap(bodyContent),
    text: `Hi ${username}, the ${monthYear} draw results are published. Visit ${APP_URL}/prizes to see the results.`,
  });
}

/**
 * Notify winner that their proof has been approved and payment is being arranged.
 */
async function sendVerificationApproved({ to, username, prizeAmount }) {
  const currency = process.env.CURRENCY_SYMBOL || '£';
  await sendMail({
    to,
    subject: `✅ Proof verified — payment of ${currency}${Number(prizeAmount).toFixed(2)} incoming`,
    html: wrap(`
      <p>Hi <strong>${username}</strong>,</p>
      <p>Great news — your eligibility proof has been <strong>approved</strong> by our team.</p>
      <div class="highlight">
        <p>Your prize of <strong>${currency}${Number(prizeAmount).toFixed(2)}</strong> is being arranged and will be transferred to you shortly.</p>
      </div>
      <p>You'll receive another notification once payment has been sent.</p>
      <a href="${APP_URL}/dashboard" class="btn">View Dashboard →</a>
    `),
    text: `Hi ${username}, your proof has been approved. Your prize of ${currency}${Number(prizeAmount).toFixed(2)} is being arranged.`,
  });
}

/**
 * Notify winner that their proof was rejected.
 */
async function sendVerificationRejected({ to, username, reason }) {
  await sendMail({
    to,
    subject: `⚠️ Proof submission — action required`,
    html: wrap(`
      <p>Hi <strong>${username}</strong>,</p>
      <p>Unfortunately, we were unable to verify your eligibility proof. Please log in and re-submit with a clearer screenshot.</p>
      ${reason ? `<div class="highlight"><p><strong>Reason:</strong> ${reason}</p></div>` : ''}
      <a href="${APP_URL}/dashboard" class="btn">Re-submit Proof →</a>
      <p>If you need help, please reply to this email.</p>
    `),
    text: `Hi ${username}, your proof was not accepted. Please log in and re-submit. ${reason ? `Reason: ${reason}` : ''}`,
  });
}

/**
 * Notify winner that their payment has been sent.
 */
async function sendPaymentSent({ to, username, prizeAmount }) {
  const currency = process.env.CURRENCY_SYMBOL || '£';
  await sendMail({
    to,
    subject: `💰 Payment sent — ${currency}${Number(prizeAmount).toFixed(2)}`,
    html: wrap(`
      <p>Hi <strong>${username}</strong>,</p>
      <p>Your prize payment of <strong>${currency}${Number(prizeAmount).toFixed(2)}</strong> has been sent!</p>
      <p>Please allow 1–3 business days for the funds to appear in your account.</p>
      <p>Thank you for playing SwingStakes and supporting your chosen charity. See you next month!</p>
      <a href="${APP_URL}/dashboard" class="btn">View Dashboard →</a>
    `),
    text: `Hi ${username}, your payment of ${currency}${Number(prizeAmount).toFixed(2)} has been sent. Allow 1-3 business days.`,
  });
}

module.exports = {
  sendWinnerAlert,
  sendDrawResultsNotification,
  sendVerificationApproved,
  sendVerificationRejected,
  sendPaymentSent,
};

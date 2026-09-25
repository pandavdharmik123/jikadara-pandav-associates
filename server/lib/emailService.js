import nodemailer from 'nodemailer';

let transporter = null;

/**
 * Initialize or get Nodemailer SMTP transporter (fallback if no Brevo API key)
 */
function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (user && pass) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });
  }

  return transporter;
}

/**
 * Send an email via Brevo REST API (HTTPS Port 443)
 * Solves Render/Vercel free-tier SMTP port blocking (ports 25, 465, 587 are blocked on cloud free tiers).
 */
async function sendViaBrevoApi({ to, subject, html, text, fromEmail, fromName }) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    throw new Error('BREVO_API_KEY is not defined');
  }

  const senderEmail =
    fromEmail ||
    process.env.BREVO_SENDER_EMAIL ||
    process.env.SMTP_USER ||
    'dhamopandav1311@gmail.com';

  const senderName =
    fromName ||
    process.env.BREVO_SENDER_NAME ||
    'Jikadara & Pandav Associates';

  const recipients = Array.isArray(to)
    ? to.map((recipient) => (typeof recipient === 'string' ? { email: recipient } : recipient))
    : [{ email: to }];

  const payload = {
    sender: { name: senderName, email: senderEmail },
    to: recipients,
    subject,
    htmlContent: html,
    ...(text ? { textContent: text } : {}),
  };

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'accept': 'application/json',
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data?.message || JSON.stringify(data);
    throw new Error(`Brevo API Error (${response.status}): ${errorMsg}`);
  }

  return {
    success: true,
    provider: 'brevo-api',
    messageId: data?.messageId,
  };
}

/**
 * Universal email dispatcher:
 * 1. Uses Brevo REST API (HTTPS port 443) when BREVO_API_KEY is available (bypasses Render/Vercel SMTP blocks).
 * 2. Uses Nodemailer SMTP as fallback when SMTP_USER & SMTP_PASS are set.
 * 3. Falls back to Dev Mode if neither is configured.
 */
export async function sendEmail({ to, subject, html, text, fromEmail, fromName }) {
  // 1. Priority: Brevo REST API (Bypasses port 587/465 blocks on Render/Vercel)
  if (process.env.BREVO_API_KEY) {
    return await sendViaBrevoApi({ to, subject, html, text, fromEmail, fromName });
  }

  // 2. Fallback: Nodemailer SMTP
  const mailer = getTransporter();
  if (mailer) {
    const from = fromEmail
      ? `"${fromName || 'Jikadara & Pandav Associates'}" <${fromEmail}>`
      : process.env.EMAIL_FROM || `"Jikadara & Pandav Associates" <${process.env.SMTP_USER}>`;

    const info = await mailer.sendMail({
      from,
      to,
      subject,
      text,
      html,
    });
    return {
      success: true,
      provider: 'smtp',
      messageId: info.messageId,
    };
  }

  // 3. Fallback: Dev Mode
  return {
    success: true,
    devMode: true,
    provider: 'dev-mode',
    message: 'Email logged to server terminal (no email provider credentials configured)',
  };
}

/**
 * Mask email for safe presentation (e.g. m•••••h@gmail.com)
 */
export function maskEmail(email) {
  if (!email || !email.includes('@')) return '';
  const [name, domain] = email.split('@');
  if (name.length <= 2) {
    return `${name[0]}•@${domain}`;
  }
  const first = name[0];
  const last = name[name.length - 1];
  const masked = '•'.repeat(Math.min(name.length - 2, 5));
  return `${first}${masked}${last}@${domain}`;
}

/**
 * Send 6-digit OTP to user's registered email
 */
export async function sendEmailOtp({ email, otp, userName = 'Advocate' }) {
  if (!email) {
    throw new Error('Email address is required');
  }

  const cleanEmail = email.trim().toLowerCase();

  // Always log OTP to server terminal as an immediate rescue fallback
  console.log('\n' + '═'.repeat(64));
  console.log(`✉️ [EMAIL OTP LOG] OTP for ${cleanEmail} is: >>> ${otp} <<<`);
  console.log('═'.repeat(64));

  const hasBrevo = Boolean(process.env.BREVO_API_KEY);
  const hasSmtp = Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);

  // 1. Dev Mode Fallback (If no credentials are set)
  if (!hasBrevo && !hasSmtp) {
    console.log('💡 Note: Set BREVO_API_KEY or SMTP credentials in server/.env to send real emails.\n');
    return {
      success: true,
      devMode: true,
      message: 'OTP generated (Dev Mode: logged to server terminal)',
    };
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; }
        .card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
        .header { background: #0a192f; color: #ffffff; padding: 28px 24px; text-align: center; }
        .header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 1px; color: #ffffff; }
        .header p { margin: 6px 0 0; font-size: 13px; color: #D4AF37; letter-spacing: 2px; text-transform: uppercase; }
        .content { padding: 32px 28px; text-align: center; color: #334155; }
        .otp-box { background: #fef9c3; border: 2px dashed #ca8a04; border-radius: 8px; padding: 18px; margin: 24px 0; display: inline-block; min-width: 220px; }
        .otp-code { font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #854d0e; font-family: monospace; }
        .expiry { color: #64748b; font-size: 13px; margin-top: 12px; }
        .footer { background: #f1f5f9; padding: 16px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>JIKADARA & PANDAV ASSOCIATES</h1>
          <p>Advocate and Legal Consultants</p>
        </div>
        <div class="content">
          <h2 style="font-size: 18px; color: #0f172a; margin-top: 0;">Two-Step Verification Code</h2>
          <p style="font-size: 14px; line-height: 1.5; color: #475569;">
            Hello <strong>${userName}</strong>,<br>
            A request was made to log in to your account. Use the verification code below to complete your sign-in:
          </p>
          <div class="otp-box">
            <div class="otp-code">${otp}</div>
          </div>
          <p class="expiry">⏱️ This code is valid for <strong>5 minutes</strong>. Do not share this code with anyone.</p>
          <p style="font-size: 12px; color: #94a3b8; margin-top: 24px;">If you did not request this login, please change your password immediately.</p>
        </div>
        <div class="footer">
          © ${new Date().getFullYear()} Jikadara & Pandav Associates. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `Your Jikadara & Pandav Associates verification code is: ${otp}. Valid for 5 minutes. Do not share this code.`;
  const subject = `[${otp}] Your Verification Code - Jikadara & Pandav Associates`;

  try {
    const result = await sendEmail({
      to: cleanEmail,
      subject,
      html: htmlContent,
      text: textContent,
      fromEmail: process.env.BREVO_SENDER_EMAIL || 'dhamopandav1311@gmail.com',
      fromName: process.env.BREVO_SENDER_NAME || 'Jikadara & Pandav Associates',
    });

    console.log(`✅ Email OTP sent successfully to ${cleanEmail} via [${result.provider}]. MessageId: ${result.messageId}`);
    return {
      success: true,
      devMode: false,
      provider: result.provider,
      message: 'OTP sent successfully to your email',
    };
  } catch (error) {
    console.error('Failed to send email OTP:', error);
    throw new Error(`Email Delivery Failed: ${error.message}`);
  }
}

export default {
  sendEmail,
  sendEmailOtp,
  maskEmail,
};


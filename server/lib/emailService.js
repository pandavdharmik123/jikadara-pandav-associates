import nodemailer from 'nodemailer';

let transporter = null;

/**
 * Initialize or get Nodemailer SMTP transporter
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
  const mailer = getTransporter();

  // Always log OTP to server terminal as an immediate rescue fallback
  console.log('\n' + '═'.repeat(64));
  console.log(`✉️ [EMAIL OTP LOG] OTP for ${cleanEmail} is: >>> ${otp} <<<`);
  console.log('═'.repeat(64));

  // 1. Dev Mode Fallback (If SMTP credentials are not yet entered)
  if (!mailer) {
    console.log('💡 Note: Set SMTP_USER and SMTP_PASS in server/.env to send real emails.\n');
    return {
      success: true,
      devMode: true,
      message: 'OTP generated (Dev Mode: logged to server terminal)',
    };
  }

  // 2. Production SMTP Dispatch
  const from = process.env.EMAIL_FROM || `"Jikadara & Pandav Associates" <${process.env.SMTP_USER}>`;

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

  try {
    const info = await mailer.sendMail({
      from,
      to: cleanEmail,
      subject: `[${otp}] Your Verification Code - Jikadara & Pandav Associates`,
      text: `Your Jikadara & Pandav Associates verification code is: ${otp}. Valid for 5 minutes. Do not share this code.`,
      html: htmlContent,
    });

    console.log(`✅ Email OTP sent successfully to ${cleanEmail}. MessageId: ${info.messageId}`);
    return {
      success: true,
      devMode: false,
      message: 'OTP sent successfully to your email',
    };
  } catch (error) {
    console.error('Failed to send email OTP via SMTP:', error);
    throw new Error(`Email Delivery Failed: ${error.message}`);
  }
}

export default {
  sendEmailOtp,
  maskEmail,
};

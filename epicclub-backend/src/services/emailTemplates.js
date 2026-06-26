/**
 * Email Templates Service for Epic Club
 * 
 * All styles are inline because Gmail and many email clients strip <style> tags.
 * Uses dark theme (#0F172A) with purple/gold accents.
 */

/**
 * Template 1: Email Verification (OTP + Magic Link)
 * 
 * @param {object} params
 * @param {string} params.name - User's first name
 * @param {string} params.otpCode - 6-digit OTP code
 * @param {string} params.magicLinkUrl - Full magic link URL for one-click verify
 * @returns {object} { subject, html, text }
 */
const emailVerificationTemplate = ({ name, otpCode, magicLinkUrl }) => {
  const firstName = name.split(' ')[0];
  const digits = otpCode.split('');

  const subject = 'Verify your Epic Club account';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verify your Epic Club account</title>
</head>
<body style="margin:0;padding:0;background-color:#0F172A;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0F172A;min-height:100vh;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

          <!-- Logo / Monogram -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <div style="width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,#7C3AED,#A855F7);display:inline-flex;align-items:center;justify-content:center;">
                <span style="font-size:28px;font-weight:900;color:#ffffff;font-family:'Segoe UI',Arial,sans-serif;line-height:72px;display:inline-block;width:72px;text-align:center;">EC</span>
              </div>
              <div style="margin-top:12px;font-size:20px;font-weight:700;color:#E2E8F0;letter-spacing:2px;text-transform:uppercase;">Epic Club</div>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:#1E293B;border-radius:16px;border:1px solid #334155;padding:40px 40px 32px;">

              <!-- Heading -->
              <h1 style="margin:0 0 8px;font-size:26px;font-weight:700;color:#F1F5F9;text-align:center;">
                Confirm your email address
              </h1>
              <p style="margin:0 0 28px;font-size:15px;color:#94A3B8;text-align:center;">
                Hi ${firstName},<br />
                Thanks for joining Epic Club! Please verify your email to complete your registration.
              </p>

              <!-- OTP Code Display -->
              <div style="background-color:#0F172A;border-radius:12px;border:1px solid #7C3AED;padding:28px 16px;text-align:center;margin-bottom:24px;">
                <p style="margin:0 0 16px;font-size:13px;font-weight:600;color:#A855F7;text-transform:uppercase;letter-spacing:2px;">Your verification code</p>
                <div style="display:inline-block;">
                  ${digits.map(d => `<span style="display:inline-block;width:44px;height:56px;line-height:56px;background:#1E293B;border:2px solid #7C3AED;border-radius:10px;font-size:28px;font-weight:700;color:#F1F5F9;text-align:center;margin:0 4px;">${d}</span>`).join('')}
                </div>
                <p style="margin:16px 0 0;font-size:13px;color:#64748B;">This code expires in <strong style="color:#F1F5F9;">15 minutes</strong></p>
              </div>

              <!-- Divider -->
              <div style="text-align:center;margin-bottom:24px;">
                <span style="font-size:13px;color:#475569;">or use the one-click link below</span>
              </div>

              <!-- Magic Link Button -->
              <div style="text-align:center;margin-bottom:32px;">
                <a href="${magicLinkUrl}" style="display:inline-block;background:linear-gradient(135deg,#7C3AED,#A855F7);color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;padding:14px 36px;border-radius:10px;letter-spacing:0.5px;">
                  ✓ &nbsp; Verify my email
                </a>
              </div>

              <!-- Warning -->
              <div style="background-color:#1a1a2e;border-left:4px solid #EF4444;border-radius:6px;padding:14px 16px;margin-bottom:0;">
                <p style="margin:0;font-size:13px;color:#94A3B8;">
                  <strong style="color:#F87171;">Security notice:</strong> If you did not create an Epic Club account, please ignore this email. This link expires in 24 hours.
                </p>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:28px;padding-bottom:20px;">
              <p style="margin:0;font-size:12px;color:#475569;">
                © ${new Date().getFullYear()} Epic Club · All rights reserved
              </p>
              <p style="margin:8px 0 0;font-size:12px;color:#334155;">
                This is an automated message, please do not reply.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `Epic Club — Verify your email

Hi ${firstName},

Your verification code is: ${otpCode}

This code expires in 15 minutes.

Or click the link below to verify instantly:
${magicLinkUrl}

If you did not create an Epic Club account, please ignore this email.

© ${new Date().getFullYear()} Epic Club`;

  return { subject, html, text };
};

/**
 * Template 2: Welcome + Awaiting Admin Approval
 * 
 * @param {object} params
 * @param {string} params.name - User's full name
 * @returns {object} { subject, html, text }
 */
const awaitingApprovalTemplate = ({ name }) => {
  const firstName = name.split(' ')[0];
  const subject = 'You\'re verified! Awaiting admin approval — Epic Club';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Awaiting Approval — Epic Club</title>
</head>
<body style="margin:0;padding:0;background-color:#0F172A;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0F172A;min-height:100vh;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <div style="width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,#7C3AED,#A855F7);display:inline-flex;align-items:center;justify-content:center;">
                <span style="font-size:28px;font-weight:900;color:#ffffff;line-height:72px;display:inline-block;width:72px;text-align:center;">EC</span>
              </div>
              <div style="margin-top:12px;font-size:20px;font-weight:700;color:#E2E8F0;letter-spacing:2px;text-transform:uppercase;">Epic Club</div>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:#1E293B;border-radius:16px;border:1px solid #334155;padding:40px 40px 32px;">

              <!-- Check Icon -->
              <div style="text-align:center;margin-bottom:24px;">
                <div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#059669,#10B981);display:inline-flex;align-items:center;justify-content:center;margin:0 auto;">
                  <span style="font-size:28px;color:#ffffff;line-height:64px;display:inline-block;width:64px;text-align:center;">✓</span>
                </div>
              </div>

              <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#F1F5F9;text-align:center;">
                Email verified!
              </h1>
              <p style="margin:0 0 28px;font-size:15px;color:#94A3B8;text-align:center;">
                Hi ${firstName}, your email address has been confirmed successfully.
              </p>

              <!-- Status Box -->
              <div style="background-color:#0F172A;border-radius:12px;border:1px solid #334155;padding:24px;margin-bottom:28px;">
                <div style="display:flex;align-items:center;margin-bottom:16px;">
                  <span style="font-size:20px;margin-right:12px;">⏳</span>
                  <div>
                    <p style="margin:0;font-size:15px;font-weight:600;color:#F1F5F9;">Awaiting admin review</p>
                    <p style="margin:4px 0 0;font-size:13px;color:#64748B;">Your account is in the approval queue</p>
                  </div>
                </div>
                <p style="margin:0;font-size:14px;color:#94A3B8;line-height:1.6;">
                  An administrator will review your registration shortly. You'll receive an email notification once your account is approved or if further information is needed.
                </p>
              </div>

              <p style="margin:0;font-size:13px;color:#64748B;text-align:center;">
                Typical review time: <strong style="color:#A855F7;">1–3 business days</strong>
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:28px;padding-bottom:20px;">
              <p style="margin:0;font-size:12px;color:#475569;">
                © ${new Date().getFullYear()} Epic Club · All rights reserved
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `Epic Club — Email verified!

Hi ${firstName},

Your email has been verified successfully.

Your account is now awaiting admin review. You will be notified by email once your account is approved.

Typical review time: 1–3 business days.

© ${new Date().getFullYear()} Epic Club`;

  return { subject, html, text };
};

/**
 * Template 3: Account Approved
 * 
 * @param {object} params
 * @param {string} params.name - User's full name
 * @param {string} params.role - Assigned role
 * @param {string} params.loginUrl - Frontend login URL
 * @returns {object} { subject, html, text }
 */
const accountApprovedTemplate = ({ name, role, loginUrl }) => {
  const firstName = name.split(' ')[0];
  const roleLabel = role === 'committee_leader' ? 'Committee Leader' : 'Member';
  const subject = '🎉 Your Epic Club account has been approved!';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Account Approved — Epic Club</title>
</head>
<body style="margin:0;padding:0;background-color:#0F172A;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0F172A;min-height:100vh;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <div style="width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,#7C3AED,#A855F7);display:inline-flex;align-items:center;justify-content:center;">
                <span style="font-size:28px;font-weight:900;color:#ffffff;line-height:72px;display:inline-block;width:72px;text-align:center;">EC</span>
              </div>
              <div style="margin-top:12px;font-size:20px;font-weight:700;color:#E2E8F0;letter-spacing:2px;text-transform:uppercase;">Epic Club</div>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:#1E293B;border-radius:16px;border:1px solid #334155;padding:40px 40px 32px;">

              <!-- Star icon -->
              <div style="text-align:center;margin-bottom:20px;">
                <span style="font-size:52px;">🎉</span>
              </div>

              <h1 style="margin:0 0 8px;font-size:26px;font-weight:700;color:#F1F5F9;text-align:center;">
                Welcome to Epic Club!
              </h1>
              <p style="margin:0 0 28px;font-size:15px;color:#94A3B8;text-align:center;">
                Hi ${firstName}, your account has been approved. You're officially a member!
              </p>

              <!-- Role Badge -->
              <div style="text-align:center;margin-bottom:28px;">
                <span style="display:inline-block;background:linear-gradient(135deg,#7C3AED,#A855F7);color:#ffffff;padding:8px 24px;border-radius:100px;font-size:14px;font-weight:600;letter-spacing:1px;">
                  ${roleLabel}
                </span>
              </div>

              <!-- What's next -->
              <div style="background-color:#0F172A;border-radius:12px;border:1px solid #334155;padding:24px;margin-bottom:28px;">
                <p style="margin:0 0 16px;font-size:14px;font-weight:600;color:#A855F7;text-transform:uppercase;letter-spacing:1px;">What's next</p>
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="padding:8px 0;border-bottom:1px solid #1E293B;">
                      <span style="font-size:18px;margin-right:12px;">📋</span>
                      <span style="font-size:14px;color:#CBD5E1;">View and manage your assigned tasks</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;border-bottom:1px solid #1E293B;">
                      <span style="font-size:18px;margin-right:12px;">📅</span>
                      <span style="font-size:14px;color:#CBD5E1;">Check upcoming meetings and events</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;">
                      <span style="font-size:18px;margin-right:12px;">👥</span>
                      <span style="font-size:14px;color:#CBD5E1;">Connect with your committee members</span>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- CTA -->
              <div style="text-align:center;">
                <a href="${loginUrl}" style="display:inline-block;background:linear-gradient(135deg,#7C3AED,#A855F7);color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;padding:14px 40px;border-radius:10px;">
                  Access your dashboard →
                </a>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:28px;padding-bottom:20px;">
              <p style="margin:0;font-size:12px;color:#475569;">
                © ${new Date().getFullYear()} Epic Club · All rights reserved
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `Epic Club — Account Approved!

Hi ${firstName},

Great news! Your Epic Club account has been approved.

Your role: ${roleLabel}

Log in now to access your dashboard:
${loginUrl}

© ${new Date().getFullYear()} Epic Club`;

  return { subject, html, text };
};

/**
 * Template 4: Account Rejected
 * 
 * @param {object} params
 * @param {string} params.name - User's full name
 * @param {string} [params.reason] - Optional rejection reason from admin
 * @returns {object} { subject, html, text }
 */
const accountRejectedTemplate = ({ name, reason }) => {
  const firstName = name.split(' ')[0];
  const subject = 'Update on your Epic Club application';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Application Update — Epic Club</title>
</head>
<body style="margin:0;padding:0;background-color:#0F172A;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0F172A;min-height:100vh;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <div style="width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,#7C3AED,#A855F7);display:inline-flex;align-items:center;justify-content:center;">
                <span style="font-size:28px;font-weight:900;color:#ffffff;line-height:72px;display:inline-block;width:72px;text-align:center;">EC</span>
              </div>
              <div style="margin-top:12px;font-size:20px;font-weight:700;color:#E2E8F0;letter-spacing:2px;text-transform:uppercase;">Epic Club</div>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:#1E293B;border-radius:16px;border:1px solid #334155;padding:40px 40px 32px;">

              <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#F1F5F9;text-align:center;">
                Application Update
              </h1>
              <p style="margin:0 0 28px;font-size:15px;color:#94A3B8;text-align:center;">
                Hi ${firstName}, we have an update regarding your Epic Club application.
              </p>

              <!-- Status -->
              <div style="background-color:#1a1a2e;border-radius:12px;border:1px solid #EF4444;padding:24px;margin-bottom:24px;text-align:center;">
                <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#F87171;text-transform:uppercase;letter-spacing:1px;">Application not approved</p>
                <p style="margin:0;font-size:14px;color:#94A3B8;line-height:1.6;">
                  After careful review, your membership request was not approved at this time. We appreciate your interest in Epic Club.
                </p>
              </div>

              ${reason ? `
              <!-- Reason -->
              <div style="background-color:#0F172A;border-radius:12px;border:1px solid #334155;padding:20px;margin-bottom:24px;">
                <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#94A3B8;text-transform:uppercase;letter-spacing:1px;">Administrator note</p>
                <p style="margin:0;font-size:14px;color:#CBD5E1;line-height:1.6;">"${reason}"</p>
              </div>
              ` : ''}

              <p style="margin:0;font-size:14px;color:#64748B;text-align:center;line-height:1.6;">
                If you believe this is a mistake or have questions, please reach out to the club administrators directly.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:28px;padding-bottom:20px;">
              <p style="margin:0;font-size:12px;color:#475569;">
                © ${new Date().getFullYear()} Epic Club · All rights reserved
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `Epic Club — Application Update

Hi ${firstName},

We regret to inform you that your Epic Club membership application was not approved at this time.
${reason ? `\nReason: ${reason}\n` : ''}
If you have questions, please contact the club administrators.

© ${new Date().getFullYear()} Epic Club`;

  return { subject, html, text };
};

module.exports = {
  emailVerificationTemplate,
  awaitingApprovalTemplate,
  accountApprovedTemplate,
  accountRejectedTemplate,
};

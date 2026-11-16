const nodemailer = require('nodemailer');

/** Names and plan titles are user/admin input: never raw HTML in an email. */
const esc = (value) => String(value == null ? '' : value)
    .replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** "Premium Plan" -> "Premium", so "the X plan" never reads "Premium Plan plan". */
const planLabel = (name) => String(name == null ? '' : name).replace(/\s+plan$/i, '');

const shell = (body) => `
      <div style="font-family: Arial, Helvetica, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px; border: 1px solid #E6E2D6; border-radius: 12px; background: #ffffff;">
        ${body}
        <p style="color: #6B6878; font-size: 12px; border-top: 1px solid #E6E2D6; padding-top: 16px; margin-top: 24px;">Protocall &middot; Investments are subject to market risk.</p>
      </div>`;

/**
 * Absolute link into the web app, from configuration only (never from request
 * headers). PUBLIC_APP_URL is the canonical setting (FRONTEND_URL is the older
 * name); outside production it falls back to the Vite dev server. null when
 * nothing is configured in production, so callers can leave the link out
 * rather than send one to localhost.
 */
const appLink = (pathname) => {
    const raw = process.env.PUBLIC_APP_URL || process.env.FRONTEND_URL
        || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5173');
    let base;
    try { base = new URL(raw); } catch { return null; }
    if (base.protocol !== 'https:' && base.protocol !== 'http:') return null;
    return `${base.origin}${base.pathname.replace(/\/+$/, '')}${pathname}`;
};

const button = (href, label) => `
        <p style="text-align: center; margin: 28px 0;">
          <a href="${esc(href)}" style="background: #6D28D9; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 700; display: inline-block;">${esc(label)}</a>
        </p>
        <p style="color: #6B6878; font-size: 13px; word-break: break-all;">If the button does not work, paste this into your browser:<br>${esc(href)}</p>`;

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: process.env.SMTP_PORT || 587,
            secure: false, // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }

    /**
     * The envelope sender.
     *
     * This used to be built as `"<SMTP_FROM>" <SMTP_USER>`, which put the SMTP
     * *username* inside the angle brackets. On a provider where the username
     * is an email address that happens to work; on AWS SES it is a credential
     * id like `inp-hv3f3p74b44mlg2l6wwfh5eh`, so every message was rejected
     * with `501 Invalid MAIL FROM address provided` — silently, because
     * sendEmail swallows its own errors. No email this application sent was
     * ever delivered.
     *
     * The address now comes from the configured sender; the username is only
     * a last resort, for providers where the two really are the same.
     */
    get fromAddress() {
        return (
            process.env.EMAIL_FROM ||
            process.env.SMTP_FROM ||
            process.env.SMTP_USER ||
            ''
        );
    }

    async sendEmail(to, subject, html) {
        try {
            if (!process.env.SMTP_USER) {
                console.warn('SMTP_USER not set. Skipping email sending. Content:', subject);
                return;
            }

            const address = this.fromAddress;
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
                // Fail loudly in the log rather than at the SMTP conversation,
                // where the real cause is much harder to recognise.
                console.error(
                    `[email] EMAIL_FROM/SMTP_FROM is not a valid address ("${address}"). ` +
                    `Not sending "${subject}".`
                );
                return null;
            }

            const info = await this.transporter.sendMail({
                from: `"${process.env.EMAIL_FROM_NAME || 'Protocall'}" <${address}>`,
                to,
                subject,
                html,
            });

            console.log('Message sent: %s', info.messageId);
            return info;
        } catch (error) {
            console.error('Error sending email:', error);
            // Don't throw error to prevent blocking main flow
            return null;
        }
    }

    // == Templates ==

    /**
     * Registration OTP.
     *
     * Inline styles and a table-free layout, because email clients strip
     * stylesheets; the code is shown large and letter-spaced so it can be read
     * off a phone and typed without transcription errors.
     */
    getOtpTemplate(userName, code, minutes) {
        return `
      <div style="font-family: Arial, Helvetica, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px; border: 1px solid #E6E2D6; border-radius: 12px; background: #ffffff;">
        <h2 style="color: #6D28D9; margin: 0 0 16px;">Confirm your email</h2>
        <p style="color: #1D1B26; font-size: 15px;">Hi ${esc(userName)},</p>
        <p style="color: #1D1B26; font-size: 15px;">Use this code to finish creating your Protocall account:</p>
        <p style="font-size: 34px; font-weight: 700; letter-spacing: 10px; color: #6D28D9; background: #F2EDFE; padding: 18px; text-align: center; border-radius: 10px; margin: 24px 0;">${esc(code)}</p>
        <p style="color: #6B6878; font-size: 14px;">The code expires in ${esc(minutes)} minutes. If you did not sign up for Protocall, you can ignore this email and nothing will happen.</p>
        <p style="color: #6B6878; font-size: 12px; border-top: 1px solid #E6E2D6; padding-top: 16px; margin-top: 24px;">Protocall &middot; Investments are subject to market risk.</p>
      </div>`;
    }

    /** Password reset link. The token is in the URL and never shown as text. */
    getPasswordResetTemplate(userName, link, minutes) {
        return `
      <div style="font-family: Arial, Helvetica, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px; border: 1px solid #E6E2D6; border-radius: 12px; background: #ffffff;">
        <h2 style="color: #6D28D9; margin: 0 0 16px;">Reset your password</h2>
        <p style="color: #1D1B26; font-size: 15px;">Hi ${esc(userName)},</p>
        <p style="color: #1D1B26; font-size: 15px;">Click the button below to choose a new password.</p>
        <p style="text-align: center; margin: 28px 0;">
          <a href="${esc(link)}" style="background: #6D28D9; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 700; display: inline-block;">Choose a new password</a>
        </p>
        <p style="color: #6B6878; font-size: 13px; word-break: break-all;">If the button does not work, paste this into your browser:<br>${esc(link)}</p>
        <p style="color: #6B6878; font-size: 14px;">This link expires in ${esc(minutes)} minutes and can be used once. <strong>If you did not ask to reset your password, ignore this email</strong> &mdash; your current password still works.</p>
        <p style="color: #6B6878; font-size: 12px; border-top: 1px solid #E6E2D6; padding-top: 16px; margin-top: 24px;">Protocall &middot; Investments are subject to market risk.</p>
      </div>`;
    }


    /**
     * Advisor application outcome. Approval carries the link to the advisor
     * dashboard (sign-in first if needed); rejection links back to the
     * application form.
     */
    getAdvisorReviewTemplate(action, userName, reason) {
        const hi = `<p style="color: #1D1B26; font-size: 15px;">Hi ${esc(userName || 'there')},</p>`;
        if (action === 'approve') {
            const link = appLink('/AdvisorDashboard');
            return shell(`
        <h2 style="color: #6D28D9; margin: 0 0 16px;">You are now a verified advisor</h2>
        ${hi}
        <p style="color: #1D1B26; font-size: 15px;">Congratulations. Your advisor application on Protocall has been approved.</p>
        <p style="color: #1D1B26; font-size: 15px;">Open your advisor dashboard to create subscription plans and publish your first advisory.</p>
        ${link ? button(link, 'Open your advisor dashboard') : '<p style="color: #1D1B26; font-size: 15px;">Sign in to Protocall and choose <strong>Advisor Dashboard</strong> from the menu.</p>'}
        <p style="color: #6B6878; font-size: 13px;">Sign in with the same account you applied with.</p>`);
        }
        if (action === 'reject') {
            const link = appLink('/AdvisorRegistration');
            return shell(`
        <h2 style="color: #1D1B26; margin: 0 0 16px;">Your advisor application was not approved</h2>
        ${hi}
        <p style="color: #1D1B26; font-size: 15px;">Reason: ${esc(reason || 'not given')}</p>
        <p style="color: #1D1B26; font-size: 15px;">You can update your details and apply again.</p>
        ${link ? button(link, 'Update your application') : ''}`);
        }
        return shell(`
        <h2 style="color: #1D1B26; margin: 0 0 16px;">Your advisor account was suspended</h2>
        ${hi}
        <p style="color: #1D1B26; font-size: 15px;">Your advisor account has been suspended${reason ? `: ${esc(reason)}` : ''}.</p>
        <p style="color: #1D1B26; font-size: 15px;">Contact support if you believe this is a mistake.</p>`);
    }

    /**
     * Account welcome, sent once the email address is verified. Every new
     * account starts on the Free plan, so this must not mention a paid plan:
     * it used to say "Welcome to Premium! Thank you for subscribing to our
     * Premium Plan" to people who never paid (client report).
     */
    getWelcomeEmailTemplate(userName) {
        return shell(`
        <h2 style="color: #6D28D9; margin: 0 0 16px;">Welcome to Protocall!</h2>
        <p style="color: #1D1B26; font-size: 15px;">Hi ${esc(userName || 'there')},</p>
        <p style="color: #1D1B26; font-size: 15px;">Your account is ready. You are on the <strong>Free</strong> plan: join stock chat rooms, vote in community polls, follow market news and track your portfolio.</p>
        <p style="color: #1D1B26; font-size: 15px;">Whenever you want more, Premium and VIP plans are on the Subscription page.</p>
        <p style="color: #1D1B26; font-size: 15px;">Best regards,<br>The Protocall Team</p>`);
    }

    /** A plan was activated (paid, or free through a 100% promo code). */
    getPlanActivatedTemplate(userName, planName, { free = false } = {}) {
        const plan = esc(planLabel(planName) || 'your');
        return shell(`
        <h2 style="color: #6D28D9; margin: 0 0 16px;">Your ${plan} plan is active</h2>
        <p style="color: #1D1B26; font-size: 15px;">Hi ${esc(userName || 'there')},</p>
        <p style="color: #1D1B26; font-size: 15px;">Your <strong>${plan}</strong> plan is now active${free ? ' (promo code applied, nothing was charged)' : ''}. Its features are unlocked on your account.</p>
        <p style="color: #1D1B26; font-size: 15px;">Best regards,<br>The Protocall Team</p>`);
    }

    getPaymentReceiptTemplate(userName, amount, planName, orderId) {
        return shell(`
        <h2 style="color: #6D28D9; margin: 0 0 16px;">Payment successful</h2>
        <p style="color: #1D1B26; font-size: 15px;">Hi ${esc(userName || 'there')},</p>
        <p style="color: #1D1B26; font-size: 15px;">We received your payment of <strong>₹${esc(amount)}</strong> for the <strong>${esc(planLabel(planName))}</strong> plan, which is now active.</p>
        <p style="color: #6B6878; font-size: 13px;">Order ID: ${esc(orderId)}</p>
        <p style="color: #1D1B26; font-size: 15px;">Thank you,<br>The Protocall Team</p>`);
    }

    getInvoiceEmailTemplate(userName, invoiceNumber, amount, pdfUrl) {
        return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #4F46E5;">Your Invoice is Ready</h2>
        <p>Hi ${esc(userName)},</p>
        <p>Thank you for your payment. Your invoice <strong>${esc(invoiceNumber)}</strong> is now available.</p>
        <p style="font-size: 24px; color: #10B981; font-weight: bold;">Amount Paid: ₹${esc(amount)}</p>
        <p>You can download your invoice from your account dashboard or use the link below:</p>
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}${esc(pdfUrl)}" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0;">Download Invoice</a>
        <br><br>
        <p>Thank you for your business!</p>
        <p style="color: #666; font-size: 12px;">If you have any questions, please contact our support team.</p>
      </div>
    `;
    }

    getAutopaySuccessTemplate(userName, amount, nextBillingDate) {
        return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #10B981;">Subscription Renewed Successfully</h2>
        <p>Hi ${esc(userName)},</p>
        <p>Your subscription has been automatically renewed. Payment of <strong>₹${esc(amount)}</strong> was successfully processed.</p>
        <p>Your next billing date: <strong>${new Date(nextBillingDate).toLocaleDateString()}</strong></p>
        <p>Thank you for continuing with us!</p>
        <br>
        <p style="color: #666; font-size: 12px;">You can manage your subscription settings anytime from your account dashboard.</p>
      </div>
    `;
    }

    getAutopayFailedTemplate(userName, amount, retryDate) {
        return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #EF4444;">Subscription Renewal Failed</h2>
        <p>Hi ${esc(userName)},</p>
        <p>We were unable to process your subscription renewal payment of <strong>₹${esc(amount)}</strong>.</p>
        <p>We will retry on: <strong>${new Date(retryDate).toLocaleDateString()}</strong></p>
        <p>Please ensure you have sufficient balance or update your payment method to avoid service interruption.</p>
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/subscription" style="display: inline-block; padding: 12px 24px; background-color: #EF4444; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0;">Update Payment Method</a>
        <br><br>
        <p style="color: #666; font-size: 12px;">If you need assistance, please contact our support team.</p>
      </div>
    `;
    }

    getRenewalReminderTemplate(userName, daysLeft, amount) {
        return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #F59E0B;">Subscription Renewal Reminder</h2>
        <p>Hi ${esc(userName)},</p>
        <p>Your subscription will expire in <strong>${esc(daysLeft)} day${daysLeft > 1 ? 's' : ''}</strong>.</p>
        <p>Renew now to continue enjoying all premium features without interruption.</p>
        <p style="font-size: 20px; color: #4F46E5; font-weight: bold;">Renewal Amount: ₹${esc(amount)}</p>
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/subscription" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0;">Renew Now</a>
        <br><br>
        <p>Don't lose access to:</p>
        <ul style="color: #666;">
          <li>Premium chat rooms</li>
          <li>Exclusive advisor picks</li>
          <li>Priority support</li>
        </ul>
      </div>
    `;
    }

    getSubscriptionCancelledTemplate(userName, endDate, reason) {
        return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #F59E0B;">Subscription Cancellation Confirmed</h2>
        <p>Hi ${esc(userName)},</p>
        <p>We've received your cancellation request. Your subscription will remain active until <strong>${new Date(endDate).toLocaleDateString()}</strong>.</p>
        ${reason ? `<p>Cancellation reason: ${esc(reason)}</p>` : ''}
        <p>You can reactivate your subscription anytime before the end date.</p>
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/subscription" style="display: inline-block; padding: 12px 24px; background-color: #10B981; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0;">Reactivate Subscription</a>
        <br><br>
        <p>We're sorry to see you go. If you have feedback on how we can improve, please let us know.</p>
      </div>
    `;
    }

    getUpgradeConfirmationTemplate(userName, oldPlan, newPlan, proRatedAmount) {
        return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #10B981;">Subscription Upgraded Successfully!</h2>
        <p>Hi ${esc(userName)},</p>
        <p>Congratulations! You've successfully upgraded from <strong>${esc(oldPlan)}</strong> to <strong>${esc(newPlan)}</strong>.</p>
        ${proRatedAmount > 0 ? `<p>Pro-rated amount charged: <strong>₹${esc(proRatedAmount)}</strong></p>` : ''}
        <p>You now have access to all premium features of the ${esc(newPlan)} plan!</p>
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/subscription" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0;">View My Subscription</a>
        <br><br>
        <p>Thank you for upgrading!</p>
      </div>
    `;
    }
}

module.exports = new EmailService();
module.exports.appLink = appLink;

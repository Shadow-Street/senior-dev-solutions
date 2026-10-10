const nodemailer = require('nodemailer');

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
        <p style="color: #1D1B26; font-size: 15px;">Hi ${userName},</p>
        <p style="color: #1D1B26; font-size: 15px;">Use this code to finish creating your Protocall account:</p>
        <p style="font-size: 34px; font-weight: 700; letter-spacing: 10px; color: #6D28D9; background: #F2EDFE; padding: 18px; text-align: center; border-radius: 10px; margin: 24px 0;">${code}</p>
        <p style="color: #6B6878; font-size: 14px;">The code expires in ${minutes} minutes. If you did not sign up for Protocall, you can ignore this email and nothing will happen.</p>
        <p style="color: #6B6878; font-size: 12px; border-top: 1px solid #E6E2D6; padding-top: 16px; margin-top: 24px;">Protocall &middot; Investments are subject to market risk.</p>
      </div>`;
    }

    /** Password reset link. The token is in the URL and never shown as text. */
    getPasswordResetTemplate(userName, link, minutes) {
        return `
      <div style="font-family: Arial, Helvetica, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px; border: 1px solid #E6E2D6; border-radius: 12px; background: #ffffff;">
        <h2 style="color: #6D28D9; margin: 0 0 16px;">Reset your password</h2>
        <p style="color: #1D1B26; font-size: 15px;">Hi ${userName},</p>
        <p style="color: #1D1B26; font-size: 15px;">Click the button below to choose a new password.</p>
        <p style="text-align: center; margin: 28px 0;">
          <a href="${link}" style="background: #6D28D9; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 700; display: inline-block;">Choose a new password</a>
        </p>
        <p style="color: #6B6878; font-size: 13px; word-break: break-all;">If the button does not work, paste this into your browser:<br>${link}</p>
        <p style="color: #6B6878; font-size: 14px;">This link expires in ${minutes} minutes and can be used once. <strong>If you did not ask to reset your password, ignore this email</strong> &mdash; your current password still works.</p>
        <p style="color: #6B6878; font-size: 12px; border-top: 1px solid #E6E2D6; padding-top: 16px; margin-top: 24px;">Protocall &middot; Investments are subject to market risk.</p>
      </div>`;
    }


    getWelcomeEmailTemplate(userName) {
        return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #4F46E5;">Welcome to Premium!</h2>
        <p>Hi ${userName},</p>
        <p>Thank you for subscribing to our Premium Plan. You now have access to exclusive features.</p>
        <p>Your journey to smarter trading begins now!</p>
        <br>
        <p>Best Regards,<br>The Team</p>
      </div>
    `;
    }

    getPaymentReceiptTemplate(userName, amount, planName, orderId) {
        return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #10B981;">Payment Successful</h2>
        <p>Hi ${userName},</p>
        <p>We received your payment of <strong>₹${amount}</strong> for the <strong>${planName}</strong>.</p>
        <p>Order ID: ${orderId}</p>
        <br>
        <p>Thank you for your business!</p>
      </div>
    `;
    }

    getInvoiceEmailTemplate(userName, invoiceNumber, amount, pdfUrl) {
        return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #4F46E5;">Your Invoice is Ready</h2>
        <p>Hi ${userName},</p>
        <p>Thank you for your payment. Your invoice <strong>${invoiceNumber}</strong> is now available.</p>
        <p style="font-size: 24px; color: #10B981; font-weight: bold;">Amount Paid: ₹${amount}</p>
        <p>You can download your invoice from your account dashboard or use the link below:</p>
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}${pdfUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0;">Download Invoice</a>
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
        <p>Hi ${userName},</p>
        <p>Your subscription has been automatically renewed. Payment of <strong>₹${amount}</strong> was successfully processed.</p>
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
        <p>Hi ${userName},</p>
        <p>We were unable to process your subscription renewal payment of <strong>₹${amount}</strong>.</p>
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
        <p>Hi ${userName},</p>
        <p>Your subscription will expire in <strong>${daysLeft} day${daysLeft > 1 ? 's' : ''}</strong>.</p>
        <p>Renew now to continue enjoying all premium features without interruption.</p>
        <p style="font-size: 20px; color: #4F46E5; font-weight: bold;">Renewal Amount: ₹${amount}</p>
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
        <p>Hi ${userName},</p>
        <p>We've received your cancellation request. Your subscription will remain active until <strong>${new Date(endDate).toLocaleDateString()}</strong>.</p>
        ${reason ? `<p>Cancellation reason: ${reason}</p>` : ''}
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
        <p>Hi ${userName},</p>
        <p>Congratulations! You've successfully upgraded from <strong>${oldPlan}</strong> to <strong>${newPlan}</strong>.</p>
        ${proRatedAmount > 0 ? `<p>Pro-rated amount charged: <strong>₹${proRatedAmount}</strong></p>` : ''}
        <p>You now have access to all premium features of the ${newPlan} plan!</p>
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/subscription" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0;">View My Subscription</a>
        <br><br>
        <p>Thank you for upgrading!</p>
      </div>
    `;
    }
}

module.exports = new EmailService();

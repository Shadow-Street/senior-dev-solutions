const db = require('../models');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const EmailService = require('./EmailService');

class InvoiceService {
    /**
     * Generate invoice number in format: INV-YYYYMMDD-XXXX
     */
    static async generateInvoiceNumber() {
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

        // Get count of invoices created today
        const todayStart = new Date(today.setHours(0, 0, 0, 0));
        const todayEnd = new Date(today.setHours(23, 59, 59, 999));

        const count = await db.Invoice.count({
            where: {
                created_at: {
                    [db.Sequelize.Op.between]: [todayStart, todayEnd]
                }
            }
        });

        const sequence = String(count + 1).padStart(4, '0');
        return `INV-${dateStr}-${sequence}`;
    }

    /**
     * Create invoice record for subscription payment
     */
    static async generateInvoice(subscriptionId, transactionId) {
        const subscription = await db.Subscription.findByPk(subscriptionId, {
            include: [
                { model: db.SubscriptionPlan, required: false },
                { model: db.User, required: false }
            ]
        });

        if (!subscription) {
            throw new Error('Subscription not found');
        }

        const transaction = await db.FundTransaction.findOne({
            where: { transaction_id: transactionId }
        });

        if (!transaction) {
            throw new Error('Transaction not found');
        }

        // Get plan and user with fallbacks
        let plan = subscription.SubscriptionPlan;
        let user = subscription.User;

        // If association didn't work, fetch manually
        if (!plan && subscription.plan_id) {
            plan = await db.SubscriptionPlan.findByPk(subscription.plan_id);
        }

        if (!user && subscription.user_id) {
            user = await db.User.findByPk(subscription.user_id);
        }

        const planName = plan?.name || subscription.plan_type || 'Subscription Plan';
        const userName = user?.name || 'Customer';

        const invoiceNumber = await this.generateInvoiceNumber();

        const invoice = await db.Invoice.create({
            invoice_number: invoiceNumber,
            user_id: subscription.user_id,
            subscription_id: subscriptionId,
            plan_name: planName,
            amount: transaction.amount,
            discount: 0, // Can be calculated from promo codes
            tax: 0, // Add GST calculation if required
            total_amount: transaction.amount,
            currency: transaction.currency || 'INR',
            status: 'paid',
            payment_method: transaction.source || 'razorpay',
            transaction_id: transactionId,
            billing_period_start: subscription.start_date,
            billing_period_end: subscription.end_date,
            issued_date: new Date(),
            paid_date: transaction.completed_at || new Date(),
            notes: `Subscription: ${planName} - ${subscription.billing_cycle || 'monthly'}`
        });

        return invoice;
    }

    /**
     * Generate PDF for invoice
     */
    static async generateInvoicePDF(invoiceId) {
        const invoice = await db.Invoice.findByPk(invoiceId, {
            include: [{ model: db.User }]
        });

        if (!invoice) {
            throw new Error('Invoice not found');
        }

        const user = invoice.User;

        // Create uploads directory if it doesn't exist
        const uploadsDir = path.join(__dirname, '../../uploads/invoices');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const filename = `${invoice.invoice_number}.pdf`;
        const filepath = path.join(uploadsDir, filename);

        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({ margin: 50 });
            const stream = fs.createWriteStream(filepath);

            doc.pipe(stream);

            // -- Colors --
            const primaryColor = '#4F46E5'; // Indigo
            const secondaryColor = '#818CF8'; // Light Indigo
            const grayColor = '#6B7280';
            const lightGray = '#F3F4F6';
            const white = '#FFFFFF';

            // -- Header Background --
            doc.rect(0, 0, 612, 160).fill(primaryColor);

            // -- Title & Company Name (White on Indigo) --
            doc.fillColor(white)
                .fontSize(28).font('Helvetica-Bold').text('INVOICE', 50, 50, { align: 'right' })
                .fontSize(12).font('Helvetica').text('Stock Trading Solutions', 50, 50, { align: 'left' });

            doc.fontSize(10)
                .text('Level 5, Tech Park', 50, 70, { align: 'left' })
                .text('Bangalore, India 560001', 50, 85, { align: 'left' })
                .text('support@tradingplatform.com', 50, 100, { align: 'left' });

            // -- Invoice Meta (White on Indigo) --
            doc.fontSize(10).font('Helvetica-Bold').text('Invoice #', 400, 100, { align: 'right' });
            doc.font('Helvetica').text(invoice.invoice_number, 400, 115, { align: 'right' });

            doc.font('Helvetica-Bold').text('Date', 500, 100, { align: 'right' });
            doc.font('Helvetica').text(invoice.issued_date.toLocaleDateString(), 500, 115, { align: 'right' });

            // Reset Position after Header
            doc.y = 200;

            // -- Bill To Section --
            doc.fillColor('black').fontSize(12).font('Helvetica-Bold').text('Bill To:', 50, 200);
            doc.fontSize(10).font('Helvetica').fillColor(grayColor)
                .text(user.name || 'Customer', 50, 220)
                .text(user.email, 50, 235);
            // .text('User Address Line 1', 50, 250); (Optional if we had address)

            // -- Table Header --
            const tableTop = 280;
            doc.rect(50, tableTop, 512, 30).fill(lightGray); // Table Header Background

            doc.fillColor('black').font('Helvetica-Bold').fontSize(10);
            doc.text('Description', 60, tableTop + 10);
            doc.text('Period', 250, tableTop + 10);
            doc.text('Amount', 450, tableTop + 10, { width: 100, align: 'right' });

            // -- Table Content --
            doc.font('Helvetica').fontSize(10).fillColor('black');
            let contentTop = tableTop + 40;

            // Row 1
            doc.text(`${invoice.plan_name} Subscription`, 60, contentTop);
            doc.text(`${invoice.billing_period_start.toLocaleDateString()} - ${invoice.billing_period_end.toLocaleDateString()}`, 250, contentTop);
            doc.text(`₹${parseFloat(invoice.amount).toFixed(2)}`, 450, contentTop, { width: 100, align: 'right' });

            // Line Separator
            doc.rect(50, contentTop + 20, 512, 1).fill(lightGray);

            let currentY = contentTop + 40;

            // Calculations
            doc.font('Helvetica');
            if (invoice.discount > 0) {
                doc.text('Discount Applied:', 300, currentY, { align: 'right' });
                doc.fillColor('#EF4444').text(`- ₹${parseFloat(invoice.discount).toFixed(2)}`, 450, currentY, { width: 100, align: 'right' });
                currentY += 20;
            }
            // GST/Tax
            if (invoice.tax > 0) {
                doc.fillColor('black').text('Tax (18% GST):', 300, currentY, { align: 'right' });
                doc.text(`₹${parseFloat(invoice.tax).toFixed(2)}`, 450, currentY, { width: 100, align: 'right' });
                currentY += 20;
            }

            // -- Total Amount Box --
            const totalBoxY = currentY + 10;
            doc.rect(350, totalBoxY, 212, 40).fill(primaryColor);

            doc.fillColor(white).font('Helvetica-Bold').fontSize(12);
            doc.text('TOTAL PAID', 365, totalBoxY + 12);
            doc.fontSize(14).text(`₹${parseFloat(invoice.total_amount).toFixed(2)}`, 450, totalBoxY + 12, { width: 100, align: 'right' });

            // -- Footer Payment Info --
            const footerY = 700;
            doc.fillColor(grayColor).fontSize(9).font('Helvetica');
            doc.text('Payment Information', 50, footerY);
            doc.rect(50, footerY + 15, 512, 1).fill(lightGray);
            doc.text(`Payment ID: ${invoice.transaction_id}`, 50, footerY + 25);
            doc.text(`Method: ${(invoice.payment_method || 'Razorpay').toUpperCase()}`, 50, footerY + 40);
            doc.text(`Status: ${(invoice.status || 'PAID').toUpperCase()}`, 200, footerY + 40);

            // -- Bottom Note --
            doc.fontSize(8).text('Thank you for choosing Stock Trading Solutions.', 50, 750, { align: 'center', width: 512 });

            doc.end();

            stream.on('finish', async () => {
                const pdfUrl = `/uploads/invoices/${filename}`;
                await invoice.update({ pdf_url: pdfUrl });
                resolve({ filepath, pdfUrl, invoice });
            });

            stream.on('error', reject);
        });
    }

    /**
     * Send invoice email to user
     */
    static async sendInvoiceEmail(invoiceId) {
        const invoice = await db.Invoice.findByPk(invoiceId, {
            include: [{ model: db.User }]
        });

        if (!invoice) {
            throw new Error('Invoice not found');
        }

        const user = invoice.User;

        // Generate PDF if not exists
        if (!invoice.pdf_url) {
            await this.generateInvoicePDF(invoiceId);
            await invoice.reload();
        }

        const emailContent = EmailService.getInvoiceEmailTemplate(
            user.name || 'Customer',
            invoice.invoice_number,
            invoice.total_amount,
            invoice.pdf_url
        );

        await EmailService.sendEmail(
            user.email,
            `Invoice ${invoice.invoice_number} - Payment Receipt`,
            emailContent
        );

        // Mark email as sent
        await invoice.update({ email_sent: true });

        return true;
    }

    /**
     * Get all invoices for a user
     */
    static async getUserInvoices(userId) {
        return await db.Invoice.findAll({
            where: { user_id: userId },
            order: [['created_at', 'DESC']],
            include: [{ model: db.Subscription, include: [{ model: db.SubscriptionPlan }] }]
        });
    }

    /**
     * Download invoice (return file path for streaming)
     */
    static async downloadInvoice(invoiceId) {
        const invoice = await db.Invoice.findByPk(invoiceId);

        if (!invoice) {
            throw new Error('Invoice not found');
        }

        if (!invoice.pdf_url) {
            await this.generateInvoicePDF(invoiceId);
            await invoice.reload();
        }

        const filepath = path.join(__dirname, '../../uploads/invoices', `${invoice.invoice_number}.pdf`);

        if (!fs.existsSync(filepath)) {
            throw new Error('Invoice PDF file not found');
        }

        return { filepath, invoice };
    }
}

module.exports = InvoiceService;

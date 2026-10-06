const nodemailer = require('nodemailer');

// Outgoing email (SMTP) and SMS (an HTTP webhook, so any SMS gateway or a small adapter in
// front of one can be plugged in). Without configuration, development prints the message to the
// server log so codes can be tested; production refuses to send.

const isProduction = () => process.env.NODE_ENV === 'production';

let transporter = null;
const getTransporter = () => {
    if (!transporter) {
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT || 587),
            secure: process.env.SMTP_SECURE === 'true',
            auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined
        });
    }
    return transporter;
};

const devOutbox = (kind, to, text) => {
    if (isProduction()) throw new Error(`${kind} delivery is not configured`);
    console.log(`[OUTBOX:${kind}] to=${to} ${text}`);
};

exports.sendEmail = async ({ to, subject, text }) => {
    if (!process.env.SMTP_HOST) return devOutbox('EMAIL', to, `subject="${subject}" text="${text}"`);
    await getTransporter().sendMail({ from: process.env.MAIL_FROM, to, subject, text });
};

// The webhook receives POST { to, message } (to = 10-digit number) with an optional bearer token
exports.sendSms = async ({ to, text }) => {
    if (!process.env.SMS_WEBHOOK_URL) return devOutbox('SMS', to, `text="${text}"`);
    const res = await fetch(process.env.SMS_WEBHOOK_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(process.env.SMS_WEBHOOK_TOKEN ? { Authorization: `Bearer ${process.env.SMS_WEBHOOK_TOKEN}` } : {})
        },
        body: JSON.stringify({ to, message: text }),
        signal: AbortSignal.timeout(10000)
    });
    if (!res.ok) throw new Error(`SMS webhook answered ${res.status}`);
};

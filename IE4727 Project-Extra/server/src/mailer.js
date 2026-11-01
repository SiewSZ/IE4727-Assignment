// Order emails with nodemailer. Project rule: emails only go to our own local mailbox
// (config.mail.localMailbox on Mercury), and say which customer they were meant for.
// Every email is also saved in email_log (shared with the PHP version), sent or not.

import nodemailer from "nodemailer";
import { config } from "./config.js";
import { query } from "./db.js";

const transport = nodemailer.createTransport({
    host: config.mail.host,
    port: config.mail.port,
    secure: false,
    tls: { rejectUnauthorized: false },
    connectionTimeout: 3000
});

export async function sendShopEmail(customerEmail, subject, body) {
    const text = `To: ${customerEmail} (delivered to ${config.mail.localMailbox} for this project)\n\n${body}\n\nQuantum Gear\n50 Nanyang Ave, Singapore | +65 6123 4567`;
    let sent = 0;
    try {
        await transport.sendMail({ from: config.mail.from, to: config.mail.localMailbox, subject, text });
        sent = 1;
    } catch {
        // No mail server running (e.g. Mercury is off): ordering still works, the log keeps the email
    }
    await query(
        "INSERT INTO email_log (to_address, intended_for, subject, body, sent) VALUES (?, ?, ?, ?, ?)",
        [config.mail.localMailbox, customerEmail, subject, text, sent]);
    return Boolean(sent);
}

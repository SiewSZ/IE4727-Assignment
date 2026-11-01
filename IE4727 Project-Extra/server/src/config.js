// Settings, read from environment variables with defaults for XAMPP on this PC.
// e.g. on Windows PowerShell:  $env:DB_PASSWORD = "secret"; npm start

export const config = {
    port: Number(process.env.PORT) || 4000,

    // The same database as the PHP version (database/schema.sql creates it)
    db: {
        host: process.env.DB_HOST || "localhost",
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "",
        database: process.env.DB_NAME || "quantum_gear"
    },

    // Signs the session cookie. Change it outside development.
    sessionSecret: process.env.SESSION_SECRET || "quantum-gear-dev-secret-change-me",

    // Project rule: emails only go to our own mailbox on the local mail server (Mercury in XAMPP)
    mail: {
        host: process.env.MAIL_HOST || "localhost",
        port: Number(process.env.MAIL_PORT) || 25,
        localMailbox: process.env.LOCAL_MAILBOX || "newuser@localhost",
        from: "Quantum Gear <orders@localhost>"
    },

    sessionMinutes: 30,      // signed out after 30 minutes without a request
    maxFailedLogins: 5,      // 5 wrong passwords in a row ...
    lockMinutes: 5,          // ... lock the account for 5 minutes
    lowStock: 5
};

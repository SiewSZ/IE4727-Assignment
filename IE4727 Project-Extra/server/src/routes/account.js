// Accounts: register, sign in, sign out, and "who am I". The same users table, password hashes
// and lockout columns as the PHP version, so an account works on both sites.

import { Router } from "express";
import bcrypt from "bcryptjs";
import { query } from "../db.js";
import { config } from "../config.js";
import { httpError, requireUser } from "../auth.js";

export const account = Router();

// PHP's password_hash() writes "$2y$" bcrypt hashes; bcryptjs reads the same hash as "$2b$"
const toNodeHash = (hash) => hash.replace(/^\$2y\$/, "$2b$");

const publicUser = (u) => ({ id: u.id, username: u.username, role: u.role });

account.get("/me", (req, res) => {
    res.json({ user: req.session.user || null });
});

account.post("/register", async (req, res) => {
    const username = String(req.body.username || "").trim();
    const email = String(req.body.email || "").trim();
    const password = String(req.body.password || "");

    // The same rules as the browser checks, repeated because those can be bypassed
    if (!/^[A-Za-z0-9_]{3,50}$/.test(username)) throw httpError(400, "Username must be 3-50 letters, numbers or underscores.");
    if (!/^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(email) || email.length > 100) throw httpError(400, "Please enter a valid email address.");
    if (password.length < 8) throw httpError(400, "Password must be at least 8 characters.");

    const taken = await query("SELECT id FROM users WHERE username = ? OR email = ?", [username, email]);
    if (taken.length) throw httpError(409, "That username or email is already registered.");

    const hash = await bcrypt.hash(password, 10);
    const result = await query("INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)", [username, email, hash]);

    // Signed straight in after registering
    req.session.user = publicUser({ id: result.insertId, username, role: "customer" });
    res.status(201).json({ user: req.session.user });
});

account.post("/login", async (req, res) => {
    const login = String(req.body.login || "").trim();
    const password = String(req.body.password || "");
    if (!login || !password) throw httpError(400, "Please enter your username/email and password.");

    const [user] = await query(
        `SELECT id, username, role, password_hash, failed_logins, locked_until > NOW() AS locked
         FROM users WHERE username = ? OR email = ?`, [login, login]);

    const lockedMessage = `Too many wrong passwords. For your security this account is locked for ${config.lockMinutes} minutes.`;
    if (user?.locked) throw httpError(423, lockedMessage);

    if (!user || !(await bcrypt.compare(password, toNodeHash(user.password_hash)))) {
        if (user) {
            const failed = user.failed_logins + 1;
            const lock = failed >= config.maxFailedLogins;
            await query(
                `UPDATE users SET failed_logins = ?, locked_until = IF(?, NOW() + INTERVAL ${config.lockMinutes} MINUTE, locked_until)
                 WHERE id = ?`, [lock ? 0 : failed, lock ? 1 : 0, user.id]);
            if (lock) throw httpError(423, lockedMessage);
        }
        // Same message for "no such user" and "wrong password"
        throw httpError(401, "Incorrect username/email or password.");
    }

    await query("UPDATE users SET last_login = NOW(), failed_logins = 0, locked_until = NULL WHERE id = ?", [user.id]);
    // A fresh session id on sign-in stops session fixation
    await new Promise((resolve, reject) => req.session.regenerate((err) => (err ? reject(err) : resolve())));
    req.session.user = publicUser(user);
    res.json({ user: req.session.user });
});

// My Account page: who I am and a summary of my shopping
account.get("/profile", requireUser, async (req, res) => {
    const [[user], [stats], favourite] = await Promise.all([
        query("SELECT username, email, role, created_at AS joined, last_login AS lastLogin FROM users WHERE id = ?", [req.user.id]),
        query(`SELECT COUNT(*) AS orders, COALESCE(SUM(total), 0) AS spent, COALESCE(SUM(discount), 0) AS saved
               FROM orders WHERE user_id = ? AND status <> 'Cancelled'`, [req.user.id]),
        query(`SELECT c.name, SUM(i.qty) AS units
               FROM orders o JOIN order_items i USING (order_id)
               JOIN products p ON p.product_id = i.product_id JOIN categories c ON c.category_id = p.category_id
               WHERE o.user_id = ? AND o.status <> 'Cancelled'
               GROUP BY c.name ORDER BY units DESC LIMIT 1`, [req.user.id])
    ]);
    res.json({ ...user, ...stats, spent: Number(stats.spent), saved: Number(stats.saved), favouriteCategory: favourite[0]?.name || null });
});

// Change password: the current password is needed, so someone at an unlocked computer can't do it
account.post("/password", requireUser, async (req, res) => {
    const current = String(req.body.current || "");
    const next = String(req.body.next || "");
    if (next.length < 8) throw httpError(400, "Your new password must be at least 8 characters.");
    if (next === current) throw httpError(400, "Your new password must be different from the current one.");

    const [row] = await query("SELECT password_hash FROM users WHERE id = ?", [req.user.id]);
    if (!(await bcrypt.compare(current, toNodeHash(row.password_hash)))) throw httpError(400, "Your current password is incorrect.");

    await query("UPDATE users SET password_hash = ? WHERE id = ?", [await bcrypt.hash(next, 10), req.user.id]);
    res.json({ ok: true });
});

account.post("/logout", (req, res) => {
    req.session.destroy(() => res.json({ ok: true }));
});

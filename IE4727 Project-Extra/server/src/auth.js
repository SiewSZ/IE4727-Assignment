// Express middleware for signed-in users and admins, plus a small error helper.

import { query } from "./db.js";

// Throw this from a route to send a JSON error with a status code: throw httpError(400, "...")
export function httpError(status, message) {
    const err = new Error(message);
    err.status = status;
    return err;
}

// Reads the account behind the session again on every request, so a role change or a deleted
// account takes effect straight away (the same rule as refreshSessionUser() in the PHP version)
async function currentUser(req) {
    if (!req.session.user) return null;
    const [row] = await query("SELECT id, username, email, role FROM users WHERE id = ?", [req.session.user.id]);
    if (!row) {
        delete req.session.user;
        return null;
    }
    req.session.user = { id: row.id, username: row.username, role: row.role };
    return row;
}

export async function requireUser(req, res, next) {
    const user = await currentUser(req);
    if (!user) return next(httpError(401, "Please sign in first."));
    req.user = user;
    next();
}

export async function requireAdmin(req, res, next) {
    const user = await currentUser(req);
    if (!user || user.role !== "admin") {
        return next(httpError(user ? 403 : 401, "Only admins can do this. Please sign in with an admin account."));
    }
    req.user = user;
    next();
}

// Wraps an async route so a thrown error reaches the error handler in index.js
export const handle = (fn) => (req, res, next) => fn(req, res, next).catch(next);

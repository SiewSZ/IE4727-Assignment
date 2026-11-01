// Quantum Gear API server (Node.js + Express).
//   npm run dev   -> API on http://localhost:4000 (the React dev server on :5173 forwards /api here)
//   npm start     -> also serves the built React app from client/dist, so one URL runs everything

import express from "express";
import session from "express-session";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";
import { ensureExtraTables } from "./db.js";
import { catalog } from "./routes/catalog.js";
import { account } from "./routes/account.js";
import { orders } from "./routes/orders.js";
import { wishlist } from "./routes/wishlist.js";
import { admin } from "./routes/admin.js";
import { eventsHandler } from "./events.js";

const app = express();

app.use(express.json({ limit: "100kb" }));
app.use(session({
    name: "qg.sid",
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    rolling: true,   // every request restarts the 30-minute timer
    cookie: {
        httpOnly: true,       // page scripts can't read the cookie
        sameSite: "strict",   // never sent with requests from other sites, which blocks CSRF
        maxAge: config.sessionMinutes * 60 * 1000
    }
}));

// CSRF: the API only accepts JSON bodies for changes. A form on another site can't send JSON
// without the browser asking this server first, and the strict cookie isn't sent cross-site anyway.
app.use("/api", (req, res, next) => {
    const changes = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method);
    if (changes && req.headers["content-type"] && !req.is("application/json")) {
        return res.status(415).json({ error: "Send JSON." });
    }
    next();
});

app.get("/api/events", eventsHandler);   // live updates (Server-Sent Events)
app.use("/api", catalog);
app.use("/api/auth", account);
app.use("/api/orders", orders);
app.use("/api/wishlist", wishlist);
app.use("/api/admin", admin);
app.use("/api", (req, res) => res.status(404).json({ error: "Not found." }));

// The built React app (after `npm run build`); any other path returns index.html so
// React Router can show the right page
const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../client/dist");
app.use(express.static(dist));
app.get(/^\/(?!api\/).*/, (req, res, next) => res.sendFile(path.join(dist, "index.html"), (err) => err && next()));

// Errors: our own httpError() messages go to the user; anything else is logged and kept generic
app.use((err, req, res, next) => {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error(err);
    const missingTable = err.code === "ER_NO_SUCH_TABLE" || err.code === "ER_BAD_DB_ERROR";
    res.status(500).json({
        error: missingTable
            ? "The database isn't set up. Import database/schema.sql in phpMyAdmin, then restart the server."
            : "Something went wrong. Please try again."
    });
});

try {
    await ensureExtraTables();
} catch (err) {
    console.error("Could not reach MySQL. Is it running in XAMPP, and is database/schema.sql imported?\n", err.message);
}
app.listen(config.port, () => console.log(`Quantum Gear API on http://localhost:${config.port}`));

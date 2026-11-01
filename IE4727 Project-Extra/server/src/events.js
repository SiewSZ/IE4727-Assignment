// Live updates with Server-Sent Events: every open page keeps one connection to /api/events and
// the server pushes small messages down it.
//   "stock"  { items: [{ id, stock }] }   to everyone, after an order, a cancellation or a restock
//   "order"  { id, customer, total }      to admins only, when a new order is placed

const clients = new Set();   // { res, isAdmin }

export function eventsHandler(req, res) {
    res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no"
    });
    res.write("retry: 5000\n\n");   // the browser reconnects after 5 s if the connection drops

    const client = { res, isAdmin: req.session.user?.role === "admin" };
    clients.add(client);

    // A comment line every 25 s keeps proxies from closing a quiet connection
    const ping = setInterval(() => res.write(": ping\n\n"), 25000);
    req.on("close", () => {
        clearInterval(ping);
        clients.delete(client);
    });
}

export function broadcast(type, data, { adminsOnly = false } = {}) {
    const message = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of clients) {
        if (!adminsOnly || client.isAdmin) client.res.write(message);
    }
}

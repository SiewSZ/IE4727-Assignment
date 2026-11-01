// Admin API: dashboard numbers for the charts, orders, and quick product edits.

import { Router } from "express";
import { query, transaction } from "../db.js";
import { config } from "../config.js";
import { httpError, requireAdmin } from "../auth.js";
import { sendShopEmail } from "../mailer.js";
import { PRODUCT_SELECT, toProduct } from "../products.js";
import { broadcast } from "../events.js";

export const admin = Router();
admin.use(requireAdmin);

const STATUSES = ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"];
const SALES = "o.status <> 'Cancelled'";

// Dashboard for the last N days (7 to 365): KPIs, revenue per day, sales by category,
// top products, low stock and the latest orders
admin.get("/stats", async (req, res) => {
    const days = Math.min(365, Math.max(7, Number(req.query.days) || 30));
    const since = `o.created_at >= CURDATE() - INTERVAL ${days - 1} DAY`;

    const [[kpi], daily, byCategory, topProducts, lowStock, recentOrders, [counts]] = await Promise.all([
        query(`SELECT COUNT(DISTINCT o.order_id) AS orders, COALESCE(SUM(i.qty), 0) AS units,
                      COALESCE(SUM(i.qty * i.unit_price), 0) AS revenue, COUNT(DISTINCT o.user_id) AS customers
               FROM orders o JOIN order_items i USING (order_id) WHERE ${SALES} AND ${since}`),
        query(`SELECT DATE(o.created_at) AS date, COUNT(DISTINCT o.order_id) AS orders, SUM(i.qty * i.unit_price) AS revenue
               FROM orders o JOIN order_items i USING (order_id) WHERE ${SALES} AND ${since}
               GROUP BY DATE(o.created_at) ORDER BY date`),
        query(`SELECT COALESCE(c.name, 'Removed products') AS name, SUM(i.qty) AS units, SUM(i.qty * i.unit_price) AS revenue
               FROM orders o JOIN order_items i USING (order_id)
               LEFT JOIN products p ON p.product_id = i.product_id LEFT JOIN categories c ON c.category_id = p.category_id
               WHERE ${SALES} AND ${since} GROUP BY name ORDER BY revenue DESC`),
        query(`SELECT i.name, SUM(i.qty) AS units, SUM(i.qty * i.unit_price) AS revenue
               FROM orders o JOIN order_items i USING (order_id) WHERE ${SALES} AND ${since}
               GROUP BY i.name ORDER BY units DESC, revenue DESC LIMIT 5`),
        query(`SELECT product_id AS id, name, stock FROM products
               WHERE is_active = 1 AND stock <= ? ORDER BY stock, name`, [config.lowStock]),
        query(`SELECT order_id AS id, customer_name AS customer, total, status, created_at AS placedAt
               FROM orders ORDER BY created_at DESC LIMIT 5`),
        query(`SELECT (SELECT COUNT(*) FROM orders WHERE status = 'Pending') AS pending,
                      (SELECT COUNT(*) FROM users) AS users,
                      (SELECT COUNT(*) FROM products WHERE is_active = 1) AS products`)
    ]);

    // One point per day, with 0 for days without orders, so the chart has no gaps
    const byDate = new Map(daily.map((d) => [d.date, d]));
    const series = [];
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        series.push({ date: key, revenue: Number(byDate.get(key)?.revenue || 0), orders: Number(byDate.get(key)?.orders || 0) });
    }

    res.json({
        days,
        kpi: {
            revenue: Number(kpi.revenue), orders: kpi.orders, units: Number(kpi.units), customers: kpi.customers,
            avgOrder: kpi.orders ? Number(kpi.revenue) / kpi.orders : 0, ...counts
        },
        daily: series,
        byCategory: byCategory.map((c) => ({ ...c, units: Number(c.units), revenue: Number(c.revenue) })),
        topProducts: topProducts.map((p) => ({ ...p, units: Number(p.units), revenue: Number(p.revenue) })),
        lowStock,
        recentOrders
    });
});

admin.get("/orders", async (req, res) => {
    const list = await query(
        `SELECT o.order_id AS id, o.customer_name AS customer, o.email, o.address_label AS addressLabel, o.address,
                o.total, o.discount, o.status, o.created_at AS placedAt, COALESCE(SUM(i.qty), 0) AS items
         FROM orders o LEFT JOIN order_items i USING (order_id)
         GROUP BY o.order_id ORDER BY o.created_at DESC, o.order_id DESC`);
    res.json(list.map((o) => ({ ...o, items: Number(o.items) })));
});

// Every order as a CSV file (opens in Excel), one row per order
admin.get("/orders.csv", async (req, res) => {
    const rows = await query(
        `SELECT o.order_id, o.created_at, o.customer_name, o.email, o.status, o.address_label, o.address,
                o.subtotal, o.discount, o.coupon_code, o.total,
                GROUP_CONCAT(CONCAT(i.qty, ' x ', i.name) ORDER BY i.item_id SEPARATOR '; ') AS items
         FROM orders o LEFT JOIN order_items i USING (order_id)
         GROUP BY o.order_id ORDER BY o.order_id`);

    // Quote every field and double any quotes inside, so commas and quotes in names stay in one cell.
    // A leading = + - @ is prefixed with ' so Excel never runs a cell as a formula.
    const cell = (v) => {
        const text = v === null || v === undefined ? "" : String(v);
        return `"${(/^[=+\-@]/.test(text) ? `'${text}` : text).replace(/"/g, '""')}"`;
    };
    const header = ["Order", "Placed", "Customer", "Email", "Status", "Address label", "Address", "Subtotal", "Discount", "Coupon", "Total", "Items"];
    const csv = [header, ...rows.map(Object.values)].map((r) => r.map(cell).join(",")).join("\r\n");

    const date = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="quantum-gear-orders-${date}.csv"`);
    res.send("﻿" + csv);   // the BOM tells Excel the file is UTF-8
});

// Change an order's status. Cancelling puts the stock back; a cancelled order can't be reopened.
admin.patch("/orders/:id", async (req, res) => {
    const id = Number(req.params.id);
    const status = String(req.body.status || "");
    if (!STATUSES.includes(status)) throw httpError(400, "Please choose a valid status.");

    const order = await transaction(async (db) => {
        const [[row]] = await db.query("SELECT status, customer_name, email FROM orders WHERE order_id = ? FOR UPDATE", [id]);
        if (!row) throw httpError(404, "That order no longer exists.");
        if (row.status === "Cancelled" && status !== "Cancelled") throw httpError(400, "A cancelled order can't be reopened.");
        if (status === "Cancelled" && row.status !== "Cancelled") {
            await db.query(
                `UPDATE products p JOIN order_items i ON i.product_id = p.product_id
                 SET p.stock = p.stock + i.qty WHERE i.order_id = ?`, [id]);
        }
        await db.query("UPDATE orders SET status = ? WHERE order_id = ?", [status, id]);
        const [stock] = await db.query(
            `SELECT p.product_id AS id, p.stock FROM products p JOIN order_items i ON i.product_id = p.product_id
             WHERE i.order_id = ?`, [id]);
        return { ...row, stock };
    });

    // Cancelling put stock back: show it on every open page straight away
    if (status === "Cancelled" && order.status !== "Cancelled") broadcast("stock", { items: order.stock });

    if (order.status !== status) {
        await sendShopEmail(order.email, `Quantum Gear order #${id}: ${status}`,
            `Hi ${order.customer_name},\n\nOrder #${id} is now: ${status}.\n\nYou can follow your orders on the My Orders page.`);
    }
    res.json({ ok: true });
});

// Every product, hidden ones included
admin.get("/products", async (req, res) => {
    const rows = await query(`${PRODUCT_SELECT} ORDER BY p.name`);
    res.json(rows.map(toProduct));
});

// Quick edit from the inventory table: price, sale price, stock, shown in the shop
admin.patch("/products/:id", async (req, res) => {
    const id = Number(req.params.id);
    const price = Number(req.body.price);
    const oldPrice = req.body.oldPrice === null || req.body.oldPrice === "" ? null : Number(req.body.oldPrice);
    const stock = Number(req.body.stock);
    const isActive = req.body.isActive ? 1 : 0;

    if (!(price >= 0)) throw httpError(400, "Price must be 0 or more.");
    if (oldPrice !== null && !(oldPrice > price)) throw httpError(400, "The regular price must be higher than the sale price, or empty.");
    if (!Number.isInteger(stock) || stock < 0) throw httpError(400, "Stock must be a whole number, 0 or more.");

    const result = await query(
        "UPDATE products SET price = ?, old_price = ?, stock = ?, is_active = ? WHERE product_id = ?",
        [price, oldPrice, stock, isActive, id]);
    if (!result.affectedRows) throw httpError(404, "That product no longer exists.");
    broadcast("stock", { items: [{ id, stock }] });
    res.json({ ok: true });
});

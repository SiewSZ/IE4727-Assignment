// Checkout and "my orders". The cart lives in the browser (React + localStorage); this checks
// every item against the database again before anything is saved.

import { Router } from "express";
import { couponDiscount, findCoupon, query, transaction } from "../db.js";
import { httpError, requireUser } from "../auth.js";
import { sendShopEmail } from "../mailer.js";
import { broadcast } from "../events.js";

export const orders = Router();

const money = (n) => `$${Number(n).toFixed(2)}`;

// Check a coupon before checkout: GET /api/orders/coupon/QUANTUM10
orders.get("/coupon/:code", async (req, res) => {
    const coupon = await findCoupon(req.params.code);
    if (!coupon) throw httpError(404, "That coupon code isn't valid.");
    res.json(coupon);
});

// Place an order: body { items: [{ id, qty }], addressLabel, address, couponCode? }
orders.post("/", requireUser, async (req, res) => {
    const addressLabel = String(req.body.addressLabel || "").trim();
    const address = String(req.body.address || "").trim();
    if (!addressLabel || !address) throw httpError(400, "Please choose a delivery address.");
    if (addressLabel.length > 50 || address.length > 255) throw httpError(400, "The delivery address is too long.");

    // Merge repeated ids and ignore anything that isn't a whole quantity of at least 1
    const cart = new Map();
    for (const item of Array.isArray(req.body.items) ? req.body.items : []) {
        const id = Number(item.id);
        const qty = Number(item.qty);
        if (Number.isInteger(id) && Number.isInteger(qty) && qty > 0) cart.set(id, (cart.get(id) || 0) + qty);
    }
    if (!cart.size) throw httpError(400, "Your cart is empty.");

    const couponCode = String(req.body.couponCode || "").trim();
    const coupon = couponCode ? await findCoupon(couponCode) : null;
    if (couponCode && !coupon) throw httpError(400, "That coupon code isn't valid.");

    const order = await transaction(async (db) => {
        // FOR UPDATE locks the rows until COMMIT, so two people can't buy the last unit
        const ids = [...cart.keys()];
        const [products] = await db.query(
            `SELECT product_id, name, price, old_price, stock FROM products
             WHERE is_active = 1 AND product_id IN (?) FOR UPDATE`, [ids]);
        const byId = new Map(products.map((p) => [p.product_id, p]));

        let subtotal = 0;
        let total = 0;
        const lines = [];
        for (const [id, qty] of cart) {
            const p = byId.get(id);
            if (!p) throw httpError(409, "One of the products in your cart is no longer sold. Please review your cart.");
            if (qty > p.stock) {
                throw httpError(409, p.stock > 0
                    ? `Sorry, only ${p.stock} of ${p.name} left in stock. Please update your cart.`
                    : `Sorry, ${p.name} has just sold out. Please remove it from your cart.`);
            }
            const regular = p.old_price ?? p.price;
            subtotal += regular * qty;
            total += p.price * qty;
            lines.push({ id, name: p.name, price: p.price, regular, qty });
        }

        // The coupon comes off the sale-price total; the minimum spend is checked on that total too
        const couponOff = couponDiscount(coupon, total);
        if (coupon && !couponOff) throw httpError(400, `${coupon.code} needs a spend of at least ${money(coupon.minSpend)}.`);
        total -= couponOff;

        const [result] = await db.query(
            `INSERT INTO orders (user_id, customer_name, email, address_label, address, subtotal, discount, total,
                                 coupon_code, coupon_discount)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [req.user.id, req.user.username, req.user.email, addressLabel, address, subtotal, subtotal - total, total,
             coupon?.code || null, couponOff]);
        for (const line of lines) {
            await db.query(
                "INSERT INTO order_items (order_id, product_id, name, unit_price, regular_price, qty) VALUES (?, ?, ?, ?, ?, ?)",
                [result.insertId, line.id, line.name, line.price, line.regular, line.qty]);
            await db.query("UPDATE products SET stock = stock - ? WHERE product_id = ?", [line.qty, line.id]);
        }
        const [stock] = await db.query("SELECT product_id AS id, stock FROM products WHERE product_id IN (?)", [ids]);
        return { orderId: result.insertId, subtotal, total, lines, couponOff, stock };
    });

    // Live updates: every open page sees the new stock; admins get a "new order" message
    broadcast("stock", { items: order.stock });
    broadcast("order", { id: order.orderId, customer: req.user.username, total: order.total }, { adminsOnly: true });

    // Acknowledge the order by email (after COMMIT, so a mail problem can't undo the order)
    await sendShopEmail(req.user.email, `Quantum Gear order #${order.orderId} confirmed`,
        `Hi ${req.user.username},\n\nThank you for your order! Here is what you bought:\n\n`
        + order.lines.map((l) => `  ${l.qty} x ${l.name}  ${money(l.price * l.qty)}`).join("\n")
        + `\n\nSubtotal: ${money(order.subtotal)}\nDiscount: -${money(order.subtotal - order.total)}`
        + (order.couponOff ? ` (includes coupon ${coupon.code}: -${money(order.couponOff)})` : "")
        + `\nTotal paid: ${money(order.total)}`
        + `\n\nDelivering to ${addressLabel}: ${address}\n\nWe will email you whenever the status of your order changes.`);

    res.status(201).json({
        orderId: order.orderId,
        total: Math.round(order.total * 100) / 100,
        couponOff: order.couponOff,
        itemCount: order.lines.reduce((sum, l) => sum + l.qty, 0)
    });
});

// The signed-in customer's orders, newest first, each with its items
orders.get("/mine", requireUser, async (req, res) => {
    const list = await query(
        `SELECT order_id AS id, address_label AS addressLabel, address, subtotal, discount, total, status,
                coupon_code AS couponCode, coupon_discount AS couponDiscount, created_at AS placedAt
         FROM orders WHERE user_id = ? ORDER BY created_at DESC, order_id DESC`, [req.user.id]);
    if (!list.length) return res.json([]);

    const items = await query(
        `SELECT i.order_id AS orderId, i.product_id AS productId, i.name, i.unit_price AS price,
                i.regular_price AS regularPrice, i.qty, p.image_path AS image
         FROM order_items i JOIN orders o USING (order_id)
         LEFT JOIN products p ON p.product_id = i.product_id
         WHERE o.user_id = ? ORDER BY i.item_id`, [req.user.id]);
    for (const order of list) {
        order.items = items.filter((i) => i.orderId === order.id)
            .map((i) => ({ ...i, image: i.image ? `/${i.image}` : null }));
    }
    res.json(list);
});

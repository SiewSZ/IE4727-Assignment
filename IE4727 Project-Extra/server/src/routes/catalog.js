// Public catalogue: products, categories, one product's page data, and writing a review.

import { Router } from "express";
import { query } from "../db.js";
import { httpError, requireUser } from "../auth.js";
import { PRODUCT_SELECT, toProduct } from "../products.js";

export const catalog = Router();

// Every product shown in the shop, with its category and units sold
catalog.get("/products", async (req, res) => {
    const rows = await query(`${PRODUCT_SELECT} WHERE p.is_active = 1 ORDER BY p.product_id`);
    res.json(rows.map(toProduct));
});

catalog.get("/categories", async (req, res) => {
    const rows = await query(
        `SELECT c.category_id AS id, c.name, COUNT(p.product_id) AS products
         FROM categories c LEFT JOIN products p ON p.category_id = c.category_id AND p.is_active = 1
         GROUP BY c.category_id ORDER BY c.name`);
    res.json(rows);
});

// Did this user buy this product in an order that wasn't cancelled? (only buyers can review)
async function hasBought(userId, productId) {
    const rows = await query(
        `SELECT 1 FROM order_items i JOIN orders o USING (order_id)
         WHERE o.user_id = ? AND i.product_id = ? AND o.status <> 'Cancelled' LIMIT 1`, [userId, productId]);
    return rows.length > 0;
}

// "Frequently bought together": products that appear in the same orders as this one (most often first).
// Until there are enough orders, PC parts get compatible parts instead (same socket / memory type),
// so the section is useful from day one. Returns { source: "orders" | "compatible", items }.
async function boughtTogether(product) {
    const rows = await query(`
        ${PRODUCT_SELECT}
        JOIN (SELECT i2.product_id, COUNT(*) AS together
              FROM order_items i1
              JOIN order_items i2 ON i2.order_id = i1.order_id AND i2.product_id <> i1.product_id
              JOIN orders o ON o.order_id = i1.order_id
              WHERE i1.product_id = ? AND o.status <> 'Cancelled'
              GROUP BY i2.product_id) t ON t.product_id = p.product_id
        WHERE p.is_active = 1 AND p.stock > 0
        ORDER BY t.together DESC, p.price LIMIT 3`, [product.id]);
    if (rows.length >= 2) return { source: "orders", items: rows.map(toProduct) };

    // What goes with each kind of part: [part type, how it must match this product]
    const pairs = {
        cpu: [["motherboard", "socket"], ["cooler", null]],
        motherboard: [["cpu", "socket"], ["memory", "memoryType"]],
        memory: [["motherboard", "memoryType"]],
        gpu: [["psu", null]],
        psu: [["gpu", null]],
        cooler: [["cpu", null]],
        storage: [["case", null]],
        case: [["psu", null], ["storage", null]]
    }[product.partType];
    if (!pairs) return { source: "orders", items: rows.map(toProduct) };

    const picks = [];
    for (const [type, matchOn] of pairs) {
        const column = { socket: "socket", memoryType: "memory_type" }[matchOn];
        const [row] = await query(
            `${PRODUCT_SELECT} WHERE p.is_active = 1 AND p.stock > 0 AND p.part_type = ?
             ${column ? `AND p.${column} = ?` : ""} ORDER BY p.price LIMIT 1`,
            column ? [type, product[matchOn]] : [type]);
        if (row) picks.push(toProduct(row));
    }
    return { source: "compatible", items: picks };
}

// Everything the product page needs in one request
catalog.get("/products/:id", async (req, res) => {
    const id = Number(req.params.id);
    const [row] = await query(`${PRODUCT_SELECT} WHERE p.product_id = ? AND p.is_active = 1`, [id]);
    if (!row) throw httpError(404, "Product not found.");
    const product = toProduct(row);

    const [related, reviews] = await Promise.all([
        query(`${PRODUCT_SELECT} WHERE p.category_id = ? AND p.product_id <> ? AND p.is_active = 1
               ORDER BY p.stock > 0 DESC, p.product_id LIMIT 8`, [row.category_id, id]),
        query(`SELECT review_id AS id, user_id AS userId, username, rating, comment, created_at AS createdAt,
                      updated_at AS updatedAt
               FROM reviews WHERE product_id = ? ORDER BY created_at DESC`, [id])
    ]);

    const userId = req.session.user?.id;
    res.json({
        product,
        together: await boughtTogether(product),
        related: related.map(toProduct),
        reviews,
        canReview: userId ? await hasBought(userId, id) : false,
        myReview: reviews.find((r) => r.userId === userId) || null
    });
});

// Write or update your review (one per customer per product)
catalog.post("/products/:id/reviews", requireUser, async (req, res) => {
    const id = Number(req.params.id);
    const rating = Number(req.body.rating);
    const comment = String(req.body.comment || "").trim();

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw httpError(400, "Please choose a rating from 1 to 5 stars.");
    if (comment.length < 10 || comment.length > 1000) throw httpError(400, "Please write a review between 10 and 1000 characters.");
    if (!(await hasBought(req.user.id, id))) throw httpError(403, "Only customers who have bought this product can review it.");

    await query(
        `INSERT INTO reviews (product_id, user_id, username, rating, comment) VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE rating = VALUES(rating), comment = VALUES(comment), updated_at = NOW()`,
        [id, req.user.id, req.user.username, rating, comment]);
    // Keep the stars on product cards in step with the reviews
    await query(
        `UPDATE products p SET
            p.rating = (SELECT ROUND(AVG(r.rating)) FROM reviews r WHERE r.product_id = p.product_id),
            p.reviews = (SELECT COUNT(*) FROM reviews r WHERE r.product_id = p.product_id)
         WHERE p.product_id = ?`, [id]);
    res.json({ ok: true });
});

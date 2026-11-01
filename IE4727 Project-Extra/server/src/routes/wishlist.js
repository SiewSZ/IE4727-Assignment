// Wishlist (new in this version): products a signed-in customer saved for later.

import { Router } from "express";
import { query } from "../db.js";
import { httpError, requireUser } from "../auth.js";

export const wishlist = Router();
wishlist.use(requireUser);

// The saved product ids, newest first (the React app already has the product details)
wishlist.get("/", async (req, res) => {
    const rows = await query("SELECT product_id FROM wishlist WHERE user_id = ? ORDER BY created_at DESC", [req.user.id]);
    res.json(rows.map((r) => r.product_id));
});

wishlist.put("/:productId", async (req, res) => {
    const productId = Number(req.params.productId);
    const [product] = await query("SELECT product_id FROM products WHERE product_id = ? AND is_active = 1", [productId]);
    if (!product) throw httpError(404, "That product is no longer sold.");
    await query("INSERT IGNORE INTO wishlist (user_id, product_id) VALUES (?, ?)", [req.user.id, productId]);
    res.json({ ok: true });
});

wishlist.delete("/:productId", async (req, res) => {
    await query("DELETE FROM wishlist WHERE user_id = ? AND product_id = ?", [req.user.id, Number(req.params.productId)]);
    res.json({ ok: true });
});

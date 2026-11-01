// MySQL connection pool (mysql2, promise API) and the tables this version adds.
// The main tables come from database/schema.sql, the same file the PHP version uses.

import mysql from "mysql2/promise";
import { config } from "./config.js";

export const pool = mysql.createPool({
    ...config.db,
    connectionLimit: 10,
    // DECIMAL columns come back as strings by default; numbers are easier to work with in JS
    decimalNumbers: true,
    dateStrings: true
});

// Runs one query and returns the rows (placeholders: ? with an array of values)
export async function query(sql, params = []) {
    const [rows] = await pool.execute(sql, params);
    return rows;
}

// Runs fn(connection) inside a transaction: COMMIT if it finishes, ROLLBACK if it throws
export async function transaction(fn) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const result = await fn(connection);
        await connection.commit();
        return result;
    } catch (err) {
        await connection.rollback();
        throw err;
    } finally {
        connection.release();
    }
}

// Tables only this version uses. Created at start-up if missing, so nothing else needs importing.
export async function ensureExtraTables() {
    await query(`
        CREATE TABLE IF NOT EXISTS wishlist (
            user_id    INT NOT NULL,
            product_id INT NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, product_id),
            CONSTRAINT fk_wishlist_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
            CONSTRAINT fk_wishlist_product FOREIGN KEY (product_id) REFERENCES products (product_id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    // Coupon codes for checkout: percent or fixed amount off, with an optional minimum spend
    await query(`
        CREATE TABLE IF NOT EXISTS coupons (
            code        VARCHAR(30) PRIMARY KEY,
            description VARCHAR(150) NOT NULL,
            type        ENUM('percent', 'fixed') NOT NULL,
            value       DECIMAL(10,2) NOT NULL,
            min_spend   DECIMAL(10,2) NOT NULL DEFAULT 0,
            active      TINYINT(1) NOT NULL DEFAULT 1,
            expires_at  DATETIME NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await query(`
        INSERT IGNORE INTO coupons (code, description, type, value, min_spend) VALUES
            ('WELCOME5', '5% off your order', 'percent', 5, 0),
            ('QUANTUM10', '10% off orders over $100', 'percent', 10, 100),
            ('SAVE50', '$50 off orders over $500', 'fixed', 50, 500)`);

    // Which coupon an order used (the PHP version leaves these at their defaults)
    await query(`
        ALTER TABLE orders
            ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(30) NULL,
            ADD COLUMN IF NOT EXISTS coupon_discount DECIMAL(10,2) NOT NULL DEFAULT 0`);
}

// A coupon that can be used right now, or null
export async function findCoupon(code) {
    const [coupon] = await query(
        `SELECT code, description, type, value, min_spend AS minSpend FROM coupons
         WHERE code = ? AND active = 1 AND (expires_at IS NULL OR expires_at > NOW())`,
        [String(code || "").trim().toUpperCase()]);
    return coupon || null;
}

// How much a coupon takes off a total (never more than the total itself)
export function couponDiscount(coupon, total) {
    if (!coupon || total < coupon.minSpend) return 0;
    const off = coupon.type === "percent" ? (total * coupon.value) / 100 : coupon.value;
    return Math.round(Math.min(off, total) * 100) / 100;
}

// Turns database rows into the product objects the React app uses.

export const PRODUCT_SELECT = `
    SELECT p.*, c.name AS category, c.icon,
           (SELECT COALESCE(SUM(i.qty), 0) FROM order_items i JOIN orders o USING (order_id)
            WHERE i.product_id = p.product_id AND o.status <> 'Cancelled') AS sold
    FROM products p
    JOIN categories c USING (category_id)`;

export function toProduct(row) {
    return {
        id: row.product_id,
        name: row.name,
        brand: row.brand,
        description: row.description || "",
        features: (row.features || "").split(/\r?\n/).map((f) => f.trim()).filter(Boolean),
        categoryId: row.category_id,
        category: row.category,
        price: Number(row.price),
        oldPrice: row.old_price === null ? null : Number(row.old_price),
        stock: row.stock,
        image: row.image_path ? `/${row.image_path}` : null,
        rating: row.rating,
        reviews: row.reviews,
        isActive: row.is_active === 1,
        partType: row.part_type || null,
        socket: row.socket || null,
        memoryType: row.memory_type || null,
        wattage: row.wattage,
        sold: Number(row.sold || 0),
        createdAt: row.created_at
    };
}

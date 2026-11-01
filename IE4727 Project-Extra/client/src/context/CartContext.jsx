// The shopping cart, kept in the browser (localStorage) so it survives reloads and works for guests.
// The server checks every item and the stock again when the order is placed.
// Items are stored as { id, qty }; prices and names always come from the live catalogue.

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useCatalog } from "./CatalogContext.jsx";

const CartContext = createContext(null);
export const useCart = () => useContext(CartContext);

const KEY = "qg-cart";
const load = () => {
    try {
        return JSON.parse(localStorage.getItem(KEY)) || [];
    } catch {
        return [];
    }
};

export function CartProvider({ children }) {
    const { byId } = useCatalog();
    const [items, setItems] = useState(load);
    const [open, setOpen] = useState(false);   // the slide-out cart drawer

    useEffect(() => {
        try {
            localStorage.setItem(KEY, JSON.stringify(items));
        } catch {
            // Storage blocked: the cart still works until the page is closed
        }
    }, [items]);

    // Never more than the stock left
    const add = (product, qty = 1) => setItems((list) => {
        const current = list.find((i) => i.id === product.id)?.qty || 0;
        const next = Math.min(product.stock, current + qty);
        return current ? list.map((i) => (i.id === product.id ? { ...i, qty: next } : i)) : [...list, { id: product.id, qty: next }];
    });
    const setQty = (id, qty) => setItems((list) => list.map((i) => (i.id === id ? { ...i, qty: Math.max(1, qty) } : i)));
    const remove = (id) => setItems((list) => list.filter((i) => i.id !== id));
    const clear = () => setItems([]);

    // Join with the catalogue: drop products no longer sold, cap quantities at today's stock
    const lines = useMemo(() => items
        .map((i) => ({ ...i, product: byId.get(i.id) }))
        .filter((l) => l.product && l.product.stock > 0)
        .map((l) => ({ ...l, qty: Math.min(l.qty, l.product.stock) })), [items, byId]);

    const totals = useMemo(() => {
        const subtotal = lines.reduce((s, l) => s + (l.product.oldPrice || l.product.price) * l.qty, 0);
        const total = lines.reduce((s, l) => s + l.product.price * l.qty, 0);
        return { subtotal, discount: subtotal - total, total, count: lines.reduce((s, l) => s + l.qty, 0) };
    }, [lines]);

    return (
        <CartContext.Provider value={{ lines, totals, add, setQty, remove, clear, open, setOpen }}>
            {children}
        </CartContext.Provider>
    );
}

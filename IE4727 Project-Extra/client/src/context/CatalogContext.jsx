// The product list, loaded once and shared by every page (Home, Shop, Deals, Compare, Builder...).
// reload() fetches it again. Live updates (Server-Sent Events from /api/events) keep stock
// numbers current on every open page, and tell admins about new orders as they happen.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, money } from "../api.js";
import { useAuth } from "./AuthContext.jsx";
import { useToast } from "./ToastContext.jsx";

const CatalogContext = createContext(null);
export const useCatalog = () => useContext(CatalogContext);

export function CatalogProvider({ children }) {
    const { user } = useAuth();
    const toast = useToast();
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [status, setStatus] = useState("loading");   // loading | ready | error
    const [live, setLive] = useState(false);           // is the live-update connection open?

    const reload = useCallback(async () => {
        try {
            const [list, cats] = await Promise.all([api("/products"), api("/categories")]);
            setProducts(list);
            setCategories(cats);
            setStatus("ready");
        } catch {
            setStatus("error");
        }
    }, []);

    useEffect(() => { reload(); }, [reload]);

    // One connection per page. Reconnects when the user changes, because the server decides
    // from the session whether this connection also gets admin-only messages.
    useEffect(() => {
        const source = new EventSource("/api/events");
        source.onopen = () => setLive(true);
        source.onerror = () => setLive(false);   // the browser retries by itself

        source.addEventListener("stock", (e) => {
            const changes = new Map(JSON.parse(e.data).items.map((i) => [i.id, i.stock]));
            setProducts((list) => list.map((p) => (changes.has(p.id) ? { ...p, stock: changes.get(p.id) } : p)));
        });
        source.addEventListener("order", (e) => {
            const order = JSON.parse(e.data);
            toast(`New order #${order.id} from ${order.customer}: ${money(order.total)}`, "info");
            // The admin page listens for this and refreshes its numbers
            window.dispatchEvent(new CustomEvent("qg:new-order", { detail: order }));
        });
        return () => source.close();
    }, [user?.id, user?.role, toast]);

    // Quick lookup by id, and the top 5 sellers for the "Bestseller" tag
    const value = useMemo(() => {
        const byId = new Map(products.map((p) => [p.id, p]));
        const bestsellerIds = new Set([...products].filter((p) => p.sold > 0)
            .sort((a, b) => b.sold - a.sold).slice(0, 5).map((p) => p.id));
        return { products, categories, status, live, reload, byId, bestsellerIds };
    }, [products, categories, status, live, reload]);

    return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

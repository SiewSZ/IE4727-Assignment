// Three small product lists:
//   wishlist        saved on the server for signed-in customers (new "wishlist" table)
//   compare         up to 4 products to compare side by side (this browser)
//   recentlyViewed  the last 10 product pages opened (this browser)

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "../api.js";
import { useAuth } from "./AuthContext.jsx";
import { useToast } from "./ToastContext.jsx";

const ListsContext = createContext(null);
export const useLists = () => useContext(ListsContext);

export const MAX_COMPARE = 4;

function useStoredList(key) {
    const [list, setList] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem(key)) || [];
        } catch {
            return [];
        }
    });
    useEffect(() => {
        try {
            localStorage.setItem(key, JSON.stringify(list));
        } catch {
            // Storage blocked: the list lasts until the page is closed
        }
    }, [key, list]);
    return [list, setList];
}

export function ListsProvider({ children }) {
    const { user } = useAuth();
    const toast = useToast();
    const [wishlist, setWishlist] = useState([]);
    const [compare, setCompare] = useStoredList("qg-compare");
    const [recentlyViewed, setRecentlyViewed] = useStoredList("qg-recent");

    // Load the signed-in customer's wishlist (empty when signed out)
    useEffect(() => {
        if (!user) return setWishlist([]);
        api("/wishlist").then(setWishlist).catch(() => setWishlist([]));
    }, [user]);

    const toggleWishlist = async (product) => {
        if (!user) return toast("Sign in to save products to your wishlist.", "info");
        const saved = wishlist.includes(product.id);
        // Update the heart straight away, then undo it if the server says no
        setWishlist((list) => (saved ? list.filter((id) => id !== product.id) : [product.id, ...list]));
        try {
            await api(`/wishlist/${product.id}`, { method: saved ? "DELETE" : "PUT", body: {} });
            toast(saved ? "Removed from your wishlist." : "Saved to your wishlist.");
        } catch (err) {
            setWishlist((list) => (saved ? [product.id, ...list] : list.filter((id) => id !== product.id)));
            toast(err.message, "error");
        }
    };

    const toggleCompare = (product) => {
        if (compare.includes(product.id)) return setCompare((list) => list.filter((id) => id !== product.id));
        if (compare.length >= MAX_COMPARE) return toast(`You can compare up to ${MAX_COMPARE} products. Remove one first.`, "info");
        setCompare((list) => [...list, product.id]);
        toast(`Added to compare (${compare.length + 1} of ${MAX_COMPARE}).`, "info");
    };

    const addRecentlyViewed = useCallback((id) => {
        setRecentlyViewed((list) => [id, ...list.filter((x) => x !== id)].slice(0, 10));
    }, [setRecentlyViewed]);

    return (
        <ListsContext.Provider value={{
            wishlist, toggleWishlist,
            compare, toggleCompare, clearCompare: () => setCompare([]),
            recentlyViewed, addRecentlyViewed
        }}>
            {children}
        </ListsContext.Provider>
    );
}

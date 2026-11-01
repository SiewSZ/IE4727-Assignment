// Quick search: press Ctrl+K (or ⌘K, or "/") anywhere, type, use ↑ ↓ and Enter to open a product.

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CornerDownLeft, Search } from "lucide-react";
import { useCatalog } from "../context/CatalogContext.jsx";
import { money } from "../api.js";
import { ProductImage } from "./Bits.jsx";

// Every word must appear in the name, brand or category; matches in the name come first
export function searchProducts(products, text) {
    const words = text.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    return products
        .filter((p) => words.every((w) => `${p.name} ${p.brand} ${p.category}`.toLowerCase().includes(w)))
        .sort((a, b) => Number(words.every((w) => b.name.toLowerCase().includes(w))) - Number(words.every((w) => a.name.toLowerCase().includes(w))));
}

export default function CommandPalette({ open, onClose }) {
    const { products } = useCatalog();
    const navigate = useNavigate();
    const [text, setText] = useState("");
    const [active, setActive] = useState(0);
    const input = useRef(null);

    const results = useMemo(() => searchProducts(products, text).slice(0, 8), [products, text]);

    useEffect(() => {
        if (open) {
            setText("");
            setActive(0);
            setTimeout(() => input.current?.focus(), 0);
        }
    }, [open]);

    if (!open) return null;

    const go = (path) => {
        onClose();
        navigate(path);
    };

    const onKeyDown = (e) => {
        if (e.key === "Escape") onClose();
        if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(i + 1, results.length - 1)); }
        if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
        if (e.key === "Enter") {
            if (results[active]) go(`/product/${results[active].id}`);
            else if (text.trim()) go(`/shop?q=${encodeURIComponent(text.trim())}`);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/60 p-4 pt-[12vh]" onClick={onClose}>
            <div role="dialog" aria-modal="true" aria-label="Search products" className="card w-full max-w-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-3 border-b border-slate-200 px-4 dark:border-slate-800">
                    <Search className="size-5 text-slate-400" aria-hidden="true" />
                    <input
                        ref={input}
                        value={text}
                        onChange={(e) => { setText(e.target.value); setActive(0); }}
                        onKeyDown={onKeyDown}
                        placeholder="Search products, brands, categories..."
                        aria-label="Search products"
                        className="flex-1 bg-transparent py-4 text-base outline-none"
                    />
                    <kbd className="rounded border border-slate-300 px-1.5 text-xs text-slate-500 dark:border-slate-700">Esc</kbd>
                </div>
                <ul className="max-h-[50vh] overflow-y-auto p-2" role="listbox" aria-label="Results">
                    {text && !results.length && <li className="muted p-4 text-center text-sm">No products match "{text}".</li>}
                    {!text && <li className="muted p-4 text-center text-sm">Start typing, e.g. "AMD", "mouse" or "NAS".</li>}
                    {results.map((p, i) => (
                        <li key={p.id} role="option" aria-selected={i === active}>
                            <button
                                onMouseEnter={() => setActive(i)}
                                onClick={() => go(`/product/${p.id}`)}
                                className={`flex w-full items-center gap-3 rounded-xl p-2 text-left ${i === active ? "bg-brand-50 dark:bg-slate-800" : ""}`}
                            >
                                <span className="photo-box size-12 shrink-0"><ProductImage product={p} className="p-1" /></span>
                                <span className="flex-1">
                                    <span className="block text-sm font-semibold">{p.name}</span>
                                    <span className="muted text-xs">{p.category}</span>
                                </span>
                                <span className="text-sm font-bold">{money(p.price)}</span>
                                {i === active && <CornerDownLeft className="size-4 text-slate-400" aria-hidden="true" />}
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

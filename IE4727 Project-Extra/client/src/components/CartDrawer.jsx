// Slide-out cart from the right edge. Opens from the header's cart button; Esc or the backdrop closes it.

import { useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Minus, Plus, ShoppingCart, Trash2, X } from "lucide-react";
import { useCart } from "../context/CartContext.jsx";
import { money } from "../api.js";
import { ProductImage } from "./Bits.jsx";

export default function CartDrawer() {
    const { lines, totals, setQty, remove, open, setOpen } = useCart();
    const navigate = useNavigate();
    const closeBtn = useRef(null);

    useEffect(() => {
        if (!open) return;
        closeBtn.current?.focus();
        const onKey = (e) => e.key === "Escape" && setOpen(false);
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [open, setOpen]);

    return (
        <div className={`fixed inset-0 z-50 print:hidden ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
            <div onClick={() => setOpen(false)} className={`absolute inset-0 bg-slate-950/50 transition-opacity ${open ? "opacity-100" : "opacity-0"}`} />
            <aside
                role="dialog"
                aria-modal="true"
                aria-label="Shopping cart"
                className={`absolute top-0 right-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 dark:bg-slate-900 ${open ? "translate-x-0" : "translate-x-full"}`}
            >
                <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-slate-800">
                    <h2 className="flex items-center gap-2 text-lg font-bold"><ShoppingCart className="size-5" /> Your cart ({totals.count})</h2>
                    <button ref={closeBtn} onClick={() => setOpen(false)} className="btn-ghost p-2" aria-label="Close cart"><X className="size-5" /></button>
                </div>

                {lines.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
                        <ShoppingCart className="size-12 text-slate-300 dark:text-slate-700" />
                        <p className="muted">Your cart is empty.</p>
                        <Link to="/shop" onClick={() => setOpen(false)} className="btn-primary">Start shopping</Link>
                    </div>
                ) : (
                    <>
                        <ul className="flex-1 divide-y divide-slate-200 overflow-y-auto px-4 dark:divide-slate-800">
                            {lines.map(({ id, qty, product }) => (
                                <li key={id} className="flex gap-3 py-4">
                                    <Link to={`/product/${id}`} onClick={() => setOpen(false)} className="photo-box size-20 shrink-0">
                                        <ProductImage product={product} className="p-1.5" />
                                    </Link>
                                    <div className="flex flex-1 flex-col gap-1">
                                        <p className="line-clamp-2 text-sm font-semibold">{product.name}</p>
                                        <p className="text-sm font-bold">{money(product.price * qty)}</p>
                                        <div className="mt-auto flex items-center gap-2">
                                            <div className="flex items-center rounded-lg border border-slate-300 dark:border-slate-700">
                                                <button onClick={() => setQty(id, qty - 1)} disabled={qty <= 1} className="p-1.5 disabled:opacity-30" aria-label="One fewer"><Minus className="size-3.5" /></button>
                                                <span className="w-8 text-center text-sm tabular-nums" aria-live="polite">{qty}</span>
                                                <button onClick={() => setQty(id, qty + 1)} disabled={qty >= product.stock} className="p-1.5 disabled:opacity-30" aria-label="One more"><Plus className="size-3.5" /></button>
                                            </div>
                                            <button onClick={() => remove(id)} className="ml-auto p-1.5 text-slate-500 hover:text-red-600" aria-label={`Remove ${product.name}`}><Trash2 className="size-4" /></button>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                        <div className="space-y-2 border-t border-slate-200 p-4 text-sm dark:border-slate-800">
                            {totals.discount > 0 && (
                                <p className="flex justify-between text-green-700 dark:text-green-400"><span>Deals you save</span><span>-{money(totals.discount)}</span></p>
                            )}
                            <p className="flex justify-between text-lg font-bold"><span>Total</span><span>{money(totals.total)}</span></p>
                            <button onClick={() => { setOpen(false); navigate("/cart"); }} className="btn-primary w-full py-3">Checkout</button>
                        </div>
                    </>
                )}
            </aside>
        </div>
    );
}

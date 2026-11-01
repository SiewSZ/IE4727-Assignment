// Hot Deals: today's Shell Shocker (rotates daily through the top 3 discounts) with a live
// countdown, then every other deal.

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Clock, ShoppingCart, Tag, Zap } from "lucide-react";
import { useCatalog } from "../context/CatalogContext.jsx";
import { useCart } from "../context/CartContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { money, percentOff } from "../api.js";
import ProductCard from "../components/ProductCard.jsx";
import { PageTitle, Price, ProductImage, SaleBadge } from "../components/Bits.jsx";

// Time left until midnight, ticking every second
function useCountdown() {
    const left = () => {
        const midnight = new Date();
        midnight.setHours(24, 0, 0, 0);
        return Math.max(0, Math.floor((midnight - new Date()) / 1000));
    };
    const [seconds, setSeconds] = useState(left);
    useEffect(() => {
        const timer = setInterval(() => setSeconds(left()), 1000);
        return () => clearInterval(timer);
    }, []);
    const pad = (n) => String(n).padStart(2, "0");
    return `${pad(Math.floor(seconds / 3600))}:${pad(Math.floor((seconds % 3600) / 60))}:${pad(seconds % 60)}`;
}

export default function Deals() {
    const { products } = useCatalog();
    const { add } = useCart();
    const toast = useToast();
    const countdown = useCountdown();

    const { shellShocker, rest } = useMemo(() => {
        const deals = products.filter((p) => percentOff(p) > 0).sort((a, b) => percentOff(b) - percentOff(a));
        const inStock = deals.filter((p) => p.stock > 0);
        // Day of the year picks one of the top 3, so the featured deal changes at midnight
        const day = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
        const pick = inStock.length ? inStock[day % Math.min(3, inStock.length)] : null;
        return { shellShocker: pick, rest: deals.filter((p) => p !== pick) };
    }, [products]);

    return (
        <>
            <PageTitle icon={Tag} title="Hot Deals">Every product on sale right now, biggest discount first.</PageTitle>

            {shellShocker && (
                <section className="card mb-10 grid overflow-hidden md:grid-cols-2" aria-labelledby="ssTitle">
                    <Link to={`/product/${shellShocker.id}`} className="relative aspect-[4/3] bg-white">
                        <ProductImage product={shellShocker} className="p-8" />
                        <SaleBadge product={shellShocker} className="absolute top-4 left-4 text-sm" />
                    </Link>
                    <div className="flex flex-col justify-center gap-4 bg-slate-950 p-8 text-white">
                        <p className="flex items-center gap-2 text-sm font-bold tracking-wide text-amber-300 uppercase"><Zap className="size-4" /> Shell Shocker</p>
                        <h2 id="ssTitle" className="text-2xl font-bold">{shellShocker.name}</h2>
                        <p className="text-slate-300">{shellShocker.description}</p>
                        <Price product={shellShocker} large />
                        <p className="inline-flex w-fit items-center gap-2 rounded-lg bg-green-500/15 px-3 py-1.5 font-semibold text-green-300">
                            You save {money(shellShocker.oldPrice - shellShocker.price)} · only {shellShocker.stock} left
                        </p>
                        <p className="flex items-center gap-2 text-sm text-slate-300">
                            <Clock className="size-4" /> Ends in <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-base font-bold text-white tabular-nums">{countdown}</span>
                        </p>
                        <button onClick={() => { add(shellShocker); toast(`${shellShocker.name} added to your cart.`); }} className="btn w-fit bg-brand-400 px-6 py-3 text-slate-950 hover:bg-brand-300">
                            <ShoppingCart className="size-4" /> Add to cart
                        </button>
                    </div>
                </section>
            )}

            <h2 className="mb-4 text-xl font-bold">All deals ({rest.length})</h2>
            {rest.length ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {rest.map((p) => <ProductCard key={p.id} product={p} />)}
                </div>
            ) : (
                <p className="card muted p-6">No other products are on sale right now.</p>
            )}
        </>
    );
}

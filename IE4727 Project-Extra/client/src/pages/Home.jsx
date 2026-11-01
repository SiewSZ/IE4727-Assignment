// Home page: hero banner, category tiles and live product rows (deals, best sellers,
// new arrivals, recently viewed), all worked out from the shared product list.

import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Cpu, Flame, Gamepad2, Headphones, History, MemoryStick, Monitor, Server, ShieldCheck, Sparkles, Tag, Truck, Wifi } from "lucide-react";
import { useCatalog } from "../context/CatalogContext.jsx";
import { useLists } from "../context/ListsContext.jsx";
import { percentOff } from "../api.js";
import ProductRow from "../components/ProductRow.jsx";
import { Skeleton } from "../components/Bits.jsx";

const CATEGORY_ICONS = {
    "Components & Storage": MemoryStick,
    "Computer Peripherals": Monitor,
    "Computer Systems": Server,
    "Electronics": Headphones,
    "Gaming & VR": Gamepad2,
    "Networking": Wifi
};

const PERKS = [
    [Truck, "Island-wide delivery", "To any saved address"],
    [ShieldCheck, "Genuine products", "Official brand stock"],
    [Tag, "Daily deals", "New Shell Shocker every day"],
    [Cpu, "PC Builder", "Checks every part fits"]
];

export default function Home() {
    const { products, categories, status, byId } = useCatalog();
    const { recentlyViewed } = useLists();

    const rows = useMemo(() => {
        const inStock = products.filter((p) => p.stock > 0);
        return {
            deals: inStock.filter((p) => percentOff(p) > 0).sort((a, b) => percentOff(b) - percentOff(a)),
            bestSellers: products.filter((p) => p.sold > 0).sort((a, b) => b.sold - a.sold).slice(0, 10),
            newArrivals: [...products].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)) || b.id - a.id).slice(0, 10),
            recent: recentlyViewed.map((id) => byId.get(id)).filter(Boolean)
        };
    }, [products, recentlyViewed, byId]);

    return (
        <>
            {/* Hero */}
            <section className="relative mb-10 overflow-hidden rounded-3xl bg-slate-950 text-white">
                <img src="/Images/Login.png" alt="" className="absolute inset-0 h-full w-full object-cover opacity-50" />
                <div className="relative grid items-center gap-8 p-8 sm:p-12 lg:grid-cols-2">
                    <div>
                        <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-semibold backdrop-blur">
                            <Sparkles className="size-4 text-amber-300" /> New: React edition with wishlist, compare and live PC Builder
                        </p>
                        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Gear up for the next level.</h1>
                        <p className="mt-4 max-w-lg text-lg text-slate-200">Graphics cards, processors, peripherals and electronics, with a PC Builder that checks every part fits before you buy.</p>
                        <div className="mt-6 flex flex-wrap gap-3">
                            <Link to="/shop" className="btn bg-white text-slate-950 hover:bg-brand-100">Shop now <ArrowRight className="size-4" /></Link>
                            <Link to="/builder" className="btn border border-white/40 text-white hover:bg-white/10"><Cpu className="size-4" /> Build a PC</Link>
                        </div>
                    </div>
                    <img src="/Images/carousel/RTX5090.svg" alt="NVIDIA GeForce RTX 5090 graphics card" className="hidden rounded-2xl shadow-2xl lg:block" />
                </div>
            </section>

            {/* Perks */}
            <section className="mb-10 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Why shop with us">
                {PERKS.map(([Icon, title, text]) => (
                    <div key={title} className="card flex items-center gap-3 p-4">
                        <Icon className="size-7 shrink-0 text-brand-700 dark:text-brand-400" aria-hidden="true" />
                        <div>
                            <p className="text-sm font-bold">{title}</p>
                            <p className="muted text-xs">{text}</p>
                        </div>
                    </div>
                ))}
            </section>

            {/* Categories */}
            <section className="mb-12" aria-labelledby="catTitle">
                <h2 id="catTitle" className="mb-4 text-xl font-bold">Shop by category</h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                    {categories.map((c) => {
                        const Icon = CATEGORY_ICONS[c.name] || Tag;
                        return (
                            <Link key={c.id} to={`/shop?category=${encodeURIComponent(c.name)}`} className="card group flex flex-col items-center gap-2 p-5 text-center transition hover:border-brand-500">
                                <span className="grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-700 transition group-hover:scale-110 dark:bg-slate-800 dark:text-brand-300">
                                    <Icon className="size-7" aria-hidden="true" />
                                </span>
                                <span className="text-sm font-semibold">{c.name}</span>
                                <span className="muted text-xs">{c.products} products</span>
                            </Link>
                        );
                    })}
                </div>
            </section>

            {status === "loading" && <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[1, 2, 3, 4].map((n) => <Skeleton key={n} className="h-80" />)}</div>}
            {status === "error" && <p className="card p-6 text-red-700 dark:text-red-300">Products could not be loaded. Is the API server running?</p>}

            <ProductRow title="Today's Deals" icon={Tag} products={rows.deals} linkTo="/deals" linkText="All deals" />
            <ProductRow title="Best Sellers" icon={Flame} products={rows.bestSellers} linkTo="/shop?sort=bestselling" />
            <ProductRow title="New Arrivals" icon={Sparkles} products={rows.newArrivals} linkTo="/shop?sort=newest" />
            <ProductRow title="Recently viewed" icon={History} products={rows.recent} />
        </>
    );
}

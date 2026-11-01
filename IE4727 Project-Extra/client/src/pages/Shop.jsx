// Shop: every product with instant filters. Filters live in the URL (?category=...&brand=...),
// so a filtered view can be bookmarked or shared, and Back undoes a filter.

import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { RotateCcw, SlidersHorizontal, Store } from "lucide-react";
import { useCatalog } from "../context/CatalogContext.jsx";
import { percentOff } from "../api.js";
import ProductCard from "../components/ProductCard.jsx";
import { PageTitle, Skeleton } from "../components/Bits.jsx";

const SORTS = {
    featured: ["Featured", () => 0],
    bestselling: ["Best selling", (a, b) => b.sold - a.sold],
    newest: ["Newest", (a, b) => String(b.createdAt).localeCompare(String(a.createdAt)) || b.id - a.id],
    "price-asc": ["Price: low to high", (a, b) => a.price - b.price],
    "price-desc": ["Price: high to low", (a, b) => b.price - a.price],
    discount: ["Biggest discount", (a, b) => percentOff(b) - percentOff(a)],
    rating: ["Top rated", (a, b) => b.rating - a.rating || b.reviews - a.reviews]
};

export default function Shop() {
    const { products, categories, status } = useCatalog();
    const [params, setParams] = useSearchParams();

    const q = params.get("q") || "";
    const chosenCategories = params.getAll("category");
    const chosenBrands = params.getAll("brand");
    const maxPrice = Number(params.get("max")) || 0;
    const inStockOnly = params.get("stock") === "1";
    const onSaleOnly = params.get("sale") === "1";
    const sort = SORTS[params.get("sort")] ? params.get("sort") : "featured";

    const brands = useMemo(() => [...new Set(products.map((p) => p.brand))].sort(), [products]);
    const priceCeiling = useMemo(() => Math.ceil(Math.max(100, ...products.map((p) => p.price)) / 100) * 100, [products]);

    // Change one URL filter; replace keeps the browser history from filling up while dragging the slider
    const update = (changes, replace = false) => {
        const next = new URLSearchParams(params);
        for (const [key, value] of Object.entries(changes)) {
            next.delete(key);
            [].concat(value).filter((v) => v !== "" && v !== null && v !== false).forEach((v) => next.append(key, v));
        }
        setParams(next, { replace });
    };
    const toggleIn = (key, list, value) => update({ [key]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value] });

    const shown = useMemo(() => {
        const words = q.toLowerCase().split(/\s+/).filter(Boolean);
        return products
            .filter((p) =>
                (!chosenCategories.length || chosenCategories.includes(p.category)) &&
                (!chosenBrands.length || chosenBrands.includes(p.brand)) &&
                (!maxPrice || p.price <= maxPrice) &&
                (!inStockOnly || p.stock > 0) &&
                (!onSaleOnly || percentOff(p) > 0) &&
                words.every((w) => `${p.name} ${p.brand} ${p.category} ${p.description}`.toLowerCase().includes(w)))
            .sort(SORTS[sort][1]);
    }, [products, q, chosenCategories, chosenBrands, maxPrice, inStockOnly, onSaleOnly, sort]);

    const checkbox = "size-4 accent-brand-700";

    return (
        <>
            <PageTitle icon={Store} title="Shop">Filters apply instantly. Every view has its own link, so you can share or bookmark it.</PageTitle>

            <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
                <aside className="card h-fit space-y-6 p-5 lg:sticky lg:top-24" aria-label="Filters">
                    <div className="flex items-center justify-between">
                        <p className="flex items-center gap-2 font-bold"><SlidersHorizontal className="size-4" /> Filters</p>
                        <button onClick={() => setParams({})} className="link inline-flex items-center gap-1 text-sm"><RotateCcw className="size-3.5" /> Reset</button>
                    </div>

                    <label className="block">
                        <span className="mb-1 block text-sm font-semibold">Search</span>
                        <input type="search" value={q} onChange={(e) => update({ q: e.target.value }, true)} placeholder="Name, brand..." className="input" />
                    </label>

                    <fieldset>
                        <legend className="mb-2 text-sm font-semibold">Category</legend>
                        {categories.map((c) => (
                            <label key={c.id} className="flex items-center gap-2 py-1 text-sm">
                                <input type="checkbox" className={checkbox} checked={chosenCategories.includes(c.name)} onChange={() => toggleIn("category", chosenCategories, c.name)} />
                                <span className="flex-1">{c.name}</span>
                                <span className="muted text-xs">{c.products}</span>
                            </label>
                        ))}
                    </fieldset>

                    <fieldset>
                        <legend className="mb-2 text-sm font-semibold">Max price: {maxPrice ? `$${maxPrice}` : "Any"}</legend>
                        <input type="range" min="0" max={priceCeiling} step="50" value={maxPrice || priceCeiling}
                            onChange={(e) => update({ max: Number(e.target.value) >= priceCeiling ? "" : e.target.value }, true)}
                            className="w-full accent-brand-700" aria-label="Maximum price" />
                    </fieldset>

                    <fieldset className="space-y-1">
                        <legend className="mb-2 text-sm font-semibold">Show only</legend>
                        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className={checkbox} checked={inStockOnly} onChange={(e) => update({ stock: e.target.checked ? "1" : "" })} /> In stock</label>
                        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className={checkbox} checked={onSaleOnly} onChange={(e) => update({ sale: e.target.checked ? "1" : "" })} /> On sale</label>
                    </fieldset>

                    <fieldset>
                        <legend className="mb-2 text-sm font-semibold">Brand</legend>
                        <div className="max-h-56 overflow-y-auto pr-1">
                            {brands.map((b) => (
                                <label key={b} className="flex items-center gap-2 py-1 text-sm">
                                    <input type="checkbox" className={checkbox} checked={chosenBrands.includes(b)} onChange={() => toggleIn("brand", chosenBrands, b)} />
                                    {b}
                                </label>
                            ))}
                        </div>
                    </fieldset>
                </aside>

                <section aria-label="Products">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <p className="muted text-sm" aria-live="polite">{shown.length} product{shown.length === 1 ? "" : "s"}</p>
                        <label className="flex items-center gap-2 text-sm font-semibold">
                            Sort by
                            <select value={sort} onChange={(e) => update({ sort: e.target.value === "featured" ? "" : e.target.value })} className="input w-auto py-2">
                                {Object.entries(SORTS).map(([key, [label]]) => <option key={key} value={key}>{label}</option>)}
                            </select>
                        </label>
                    </div>

                    {status === "loading" ? (
                        <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">{[1, 2, 3, 4, 5, 6].map((n) => <Skeleton key={n} className="h-96" />)}</div>
                    ) : shown.length ? (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            {shown.map((p) => <ProductCard key={p.id} product={p} />)}
                        </div>
                    ) : (
                        <div className="card p-10 text-center">
                            <p className="font-semibold">No products match these filters.</p>
                            <button onClick={() => setParams({})} className="btn-ghost mt-4">Clear all filters</button>
                        </div>
                    )}
                </section>
            </div>
        </>
    );
}

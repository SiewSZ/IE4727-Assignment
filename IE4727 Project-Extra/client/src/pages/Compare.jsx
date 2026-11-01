// Compare up to 4 products side by side. The best price, rating and stock in each row are highlighted.

import { Link } from "react-router-dom";
import { Scale, ShoppingCart, X } from "lucide-react";
import { useLists, MAX_COMPARE } from "../context/ListsContext.jsx";
import { useCatalog } from "../context/CatalogContext.jsx";
import { useCart } from "../context/CartContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { money, percentOff } from "../api.js";
import { PageTitle, ProductImage, Stars } from "../components/Bits.jsx";

export default function Compare() {
    const { compare, toggleCompare, clearCompare } = useLists();
    const { byId } = useCatalog();
    const { add } = useCart();
    const toast = useToast();
    const items = compare.map((id) => byId.get(id)).filter(Boolean);

    if (!items.length) {
        return (
            <div className="card p-10 text-center">
                <Scale className="mx-auto size-12 text-slate-300 dark:text-slate-700" />
                <h1 className="mt-4 text-xl font-bold">Compare products side by side</h1>
                <p className="muted mt-2">Tap the scales button on up to {MAX_COMPARE} products, then come back here.</p>
                <Link to="/shop" className="btn-primary mt-4">Browse products</Link>
            </div>
        );
    }

    const lowest = Math.min(...items.map((p) => p.price));
    const best = (value, values) => items.length > 1 && value === Math.max(...values);
    const highlight = "bg-green-600/10 font-semibold text-green-800 dark:text-green-300";

    const rows = [
        ["Price", (p) => money(p.price), (p) => items.length > 1 && p.price === lowest],
        ["Discount", (p) => (percentOff(p) ? `${percentOff(p)}% off` : "–"), (p) => best(percentOff(p), items.map(percentOff)) && percentOff(p) > 0],
        ["Rating", (p) => <span className="inline-flex items-center gap-2"><Stars rating={p.rating} /> ({p.reviews})</span>, (p) => best(p.rating, items.map((x) => x.rating)) && p.rating > 0],
        ["Stock", (p) => (p.stock ? `${p.stock} in stock` : "Out of stock"), (p) => best(p.stock, items.map((x) => x.stock))],
        ["Brand", (p) => p.brand],
        ["Category", (p) => p.category],
        ["Socket", (p) => p.socket || "–"],
        ["Memory", (p) => p.memoryType || "–"],
        ["Power", (p) => (p.wattage ? `${p.wattage}W` : "–")],
        ["Key features", (p) => <ul className="list-disc space-y-1 pl-4 text-left">{p.features.map((f) => <li key={f}>{f}</li>)}</ul>]
    ];

    return (
        <>
            <PageTitle icon={Scale} title="Compare products">The best value in each row is highlighted in green.</PageTitle>
            <button onClick={clearCompare} className="link mb-4 text-sm">Clear all</button>
            <div className="card overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-sm">
                    <thead>
                        <tr>
                            <th className="w-36 p-4 text-left align-bottom"><span className="sr-only">Detail</span></th>
                            {items.map((p) => (
                                <th key={p.id} scope="col" className="p-4 align-top font-normal">
                                    <div className="relative">
                                        <button onClick={() => toggleCompare(p)} className="absolute -top-1 right-0 rounded-full p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label={`Remove ${p.name}`}><X className="size-4" /></button>
                                        <Link to={`/product/${p.id}`} className="photo-box mx-auto mb-3 block aspect-square w-32"><ProductImage product={p} className="p-2" /></Link>
                                        <Link to={`/product/${p.id}`} className="block font-semibold hover:underline">{p.name}</Link>
                                        <button onClick={() => { add(p); toast(`${p.name} added to your cart.`); }} disabled={!p.stock} className="btn-primary mt-3 w-full"><ShoppingCart className="size-4" /> Add</button>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map(([label, show, isBest]) => (
                            <tr key={label} className="border-t border-slate-200 dark:border-slate-800">
                                <th scope="row" className="muted p-4 text-left font-semibold">{label}</th>
                                {items.map((p) => <td key={p.id} className={`p-4 text-center align-top ${isBest?.(p) ? highlight : ""}`}>{show(p)}</td>)}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}

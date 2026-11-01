// Product details: features, price, stock, quantity, Add to Cart / Buy Now, wishlist, compare,
// customer reviews (buyers can write one) and related products.

import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { BadgeCheck, ChevronRight, Heart, Scale, ShoppingCart, Star, Truck, Zap } from "lucide-react";
import { api, money, niceDate, percentOff } from "../api.js";
import { useCart } from "../context/CartContext.jsx";
import { useLists } from "../context/ListsContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { useCatalog } from "../context/CatalogContext.jsx";
import ProductRow from "../components/ProductRow.jsx";
import { Price, ProductImage, SaleBadge, Skeleton, Stars } from "../components/Bits.jsx";

function ReviewForm({ productId, myReview, onSaved }) {
    const [rating, setRating] = useState(myReview?.rating || 0);
    const [hover, setHover] = useState(0);
    const [comment, setComment] = useState(myReview?.comment || "");
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);
    const toast = useToast();

    const submit = async (e) => {
        e.preventDefault();
        if (!rating) return setError("Please choose a rating from 1 to 5 stars.");
        if (comment.trim().length < 10) return setError("Please write at least 10 characters so other shoppers can learn from your review.");
        setSaving(true);
        try {
            await api(`/products/${productId}/reviews`, { method: "POST", body: { rating, comment } });
            setError("");
            toast("Thank you! Your review has been saved.");
            onSaved();
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={submit} className="card mb-6 space-y-3 p-5" noValidate>
            <h3 className="font-bold">{myReview ? "Update your review" : "Write a review"}</h3>
            <div className="flex gap-1" role="radiogroup" aria-label="Your rating" onMouseLeave={() => setHover(0)}>
                {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? "s" : ""}`}
                        onMouseEnter={() => setHover(n)} onClick={() => setRating(n)}
                        className="text-amber-500 transition hover:scale-110 dark:text-amber-400">
                        <Star className={`size-7 ${n <= (hover || rating) ? "fill-current" : ""}`} />
                    </button>
                ))}
            </div>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={4} maxLength={1000} className="input" placeholder="What did you like or dislike? How are you using it?" aria-label="Your review" />
            {error && <p className="text-sm text-red-700 dark:text-red-400" role="alert">{error}</p>}
            <button disabled={saving} className="btn-primary">{saving ? "Saving..." : myReview ? "Update review" : "Post review"}</button>
        </form>
    );
}

// "Frequently bought together" (from real orders) or "Pairs well with" (compatible parts when
// there aren't enough orders yet). Tick what you want and add it all in one click.
function BoughtTogether({ product, together }) {
    const { add, setOpen } = useCart();
    const toast = useToast();
    const items = [product, ...together.items].filter((p) => p.stock > 0);
    const [picked, setPicked] = useState(() => new Set(items.map((p) => p.id)));
    if (!together.items.length || items.length < 2) return null;

    const chosen = items.filter((p) => picked.has(p.id));
    const total = chosen.reduce((s, p) => s + p.price, 0);
    const toggle = (id) => setPicked((set) => {
        const next = new Set(set);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
    });
    const addAll = () => {
        chosen.forEach((p) => add(p, 1));
        toast(`${chosen.length} item${chosen.length > 1 ? "s" : ""} added to your cart.`);
        setOpen(true);
    };

    return (
        <section className="card mt-10 p-6">
            <h2 className="text-xl font-bold">{together.source === "orders" ? "Frequently bought together" : "Pairs well with"}</h2>
            <p className="muted mb-4 text-sm">{together.source === "orders" ? "Customers who bought this also bought these in the same order." : "Parts that fit this one, checked by socket, memory type and power."}</p>
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
                <ul className="grid flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {items.map((p) => (
                        <li key={p.id}>
                            <label className={`flex h-full cursor-pointer gap-3 rounded-xl border p-3 text-sm transition ${picked.has(p.id) ? "border-brand-600 dark:border-brand-400" : "border-slate-200 opacity-60 dark:border-slate-800"}`}>
                                <input type="checkbox" checked={picked.has(p.id)} onChange={() => toggle(p.id)} className="mt-1 accent-brand-700" />
                                <span className="photo-box size-16 shrink-0"><ProductImage product={p} className="p-1" /></span>
                                <span className="flex flex-col">
                                    {p.id === product.id ? <span className="font-semibold">This item: {p.name}</span>
                                        : <Link to={`/product/${p.id}`} className="font-semibold hover:underline">{p.name}</Link>}
                                    <span className="mt-auto font-bold">{money(p.price)}</span>
                                </span>
                            </label>
                        </li>
                    ))}
                </ul>
                <div className="shrink-0 text-center lg:w-56">
                    <p className="muted text-sm">Total for {chosen.length} item{chosen.length === 1 ? "" : "s"}</p>
                    <p className="text-2xl font-bold">{money(total)}</p>
                    <button onClick={addAll} disabled={!chosen.length} className="btn-primary mt-2 w-full"><ShoppingCart className="size-4" /> Add selected to cart</button>
                </div>
            </div>
        </section>
    );
}

export default function ProductPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { add, setOpen } = useCart();
    const { wishlist, toggleWishlist, compare, toggleCompare, addRecentlyViewed } = useLists();
    const { bestsellerIds, byId } = useCatalog();
    const toast = useToast();
    const [data, setData] = useState(null);
    const [error, setError] = useState("");
    const [qty, setQty] = useState(1);

    const load = useCallback(() => {
        api(`/products/${id}`).then(setData).catch((err) => setError(err.message));
    }, [id]);

    useEffect(() => {
        setData(null);
        setError("");
        setQty(1);
        load();
        addRecentlyViewed(Number(id));
    }, [id, load, addRecentlyViewed]);

    if (error) {
        return (
            <div className="card p-10 text-center">
                <h1 className="text-xl font-bold">Product not found</h1>
                <p className="muted mt-2">It may have been removed. Have a look at what else is in stock.</p>
                <Link to="/shop" className="btn-primary mt-4">Browse the shop</Link>
            </div>
        );
    }
    if (!data) return <div className="grid gap-6 md:grid-cols-2"><Skeleton className="aspect-square" /><Skeleton className="h-96" /></div>;

    const { together, related, reviews, canReview, myReview } = data;
    // Stock comes from the shared catalogue when it has this product, so live updates show here too
    const p = { ...data.product, stock: byId.get(data.product.id)?.stock ?? data.product.stock };
    const average = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
    const inStock = p.stock > 0;

    const addToCart = (buyNow = false) => {
        add(p, qty);
        if (buyNow) return navigate("/cart");
        toast(`${qty} × ${p.name} added to your cart.`);
        setOpen(true);
    };

    return (
        <>
            <nav className="muted mb-4 flex flex-wrap items-center gap-1 text-sm" aria-label="Breadcrumb">
                <Link to="/" className="hover:underline">Home</Link><ChevronRight className="size-3.5" />
                <Link to={`/shop?category=${encodeURIComponent(p.category)}`} className="hover:underline">{p.category}</Link><ChevronRight className="size-3.5" />
                <span aria-current="page" className="text-slate-900 dark:text-slate-100">{p.name}</span>
            </nav>

            <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
                <div className="photo-box relative aspect-square">
                    <ProductImage product={p} className="p-10" />
                    <SaleBadge product={p} className="absolute top-4 left-4 text-sm" />
                </div>

                <div className="space-y-5">
                    <div>
                        <p className="text-sm font-bold tracking-wide text-slate-500 uppercase dark:text-slate-400">
                            {p.brand}
                            {bestsellerIds.has(p.id) && <span className="ml-2 rounded bg-orange-100 px-2 py-0.5 text-xs text-orange-800 normal-case dark:bg-orange-500/15 dark:text-orange-300">Bestseller</span>}
                        </p>
                        <h1 className="mt-1 text-3xl font-bold">{p.name}</h1>
                        <a href="#reviews" className="mt-2 inline-flex items-center gap-2 text-sm">
                            <Stars rating={Math.round(average)} />
                            <span className="muted">{reviews.length ? `${average.toFixed(1)} (${reviews.length} review${reviews.length > 1 ? "s" : ""})` : "No reviews yet"}</span>
                        </a>
                    </div>

                    <div className="card space-y-4 p-5">
                        <Price product={p} large />
                        {percentOff(p) > 0 && <p className="w-fit rounded-lg bg-green-600/10 px-3 py-1 font-semibold text-green-700 dark:text-green-400">You save {money(p.oldPrice - p.price)} ({percentOff(p)}%)</p>}
                        <p className={`font-semibold ${!inStock ? "text-red-700 dark:text-red-400" : p.stock <= 5 ? "text-orange-700 dark:text-orange-300" : "text-green-700 dark:text-green-400"}`}>
                            {!inStock ? "Out of stock" : p.stock <= 5 ? `Only ${p.stock} left, order soon` : `In stock (${p.stock} available)`}
                        </p>
                        <p className="muted flex items-center gap-2 text-sm"><Truck className="size-4" /> Delivered to any of your saved addresses</p>

                        {inStock && (
                            <div className="flex flex-wrap items-center gap-3">
                                <label className="flex items-center gap-2 text-sm font-semibold">
                                    Qty
                                    <select value={qty} onChange={(e) => setQty(Number(e.target.value))} className="input w-20 py-2">
                                        {Array.from({ length: Math.min(10, p.stock) }, (_, i) => i + 1).map((n) => <option key={n}>{n}</option>)}
                                    </select>
                                </label>
                                <button onClick={() => addToCart()} className="btn-primary flex-1 py-3"><ShoppingCart className="size-4" /> Add to cart</button>
                                <button onClick={() => addToCart(true)} className="btn-ghost flex-1 py-3"><Zap className="size-4" /> Buy now</button>
                            </div>
                        )}
                        <div className="flex gap-2">
                            <button onClick={() => toggleWishlist(p)} className="btn-ghost flex-1" aria-pressed={wishlist.includes(p.id)}>
                                <Heart className={`size-4 ${wishlist.includes(p.id) ? "fill-red-600 text-red-600" : ""}`} /> {wishlist.includes(p.id) ? "Saved" : "Save"}
                            </button>
                            <button onClick={() => toggleCompare(p)} className="btn-ghost flex-1" aria-pressed={compare.includes(p.id)}>
                                <Scale className="size-4" /> {compare.includes(p.id) ? "Comparing" : "Compare"}
                            </button>
                        </div>
                    </div>

                    {p.features.length > 0 && (
                        <section className="card p-5">
                            <h2 className="mb-3 font-bold">Key features</h2>
                            <ul className="space-y-2 text-sm">
                                {p.features.map((f) => <li key={f} className="flex gap-2"><BadgeCheck className="mt-0.5 size-4 shrink-0 text-brand-700 dark:text-brand-400" aria-hidden="true" />{f}</li>)}
                            </ul>
                        </section>
                    )}
                </div>
            </div>

            {together && <BoughtTogether key={p.id} product={p} together={together} />}

            <section className="card mt-10 p-6">
                <h2 className="mb-2 text-xl font-bold">About this product</h2>
                <p className="muted max-w-3xl leading-relaxed">{p.description}</p>
                <dl className="mt-4 grid max-w-xl grid-cols-[auto_1fr] gap-x-8 gap-y-2 text-sm">
                    <dt className="muted">Brand</dt><dd>{p.brand}</dd>
                    <dt className="muted">Category</dt><dd>{p.category}</dd>
                    {p.socket && <><dt className="muted">Socket</dt><dd>{p.socket}</dd></>}
                    {p.memoryType && <><dt className="muted">Memory</dt><dd>{p.memoryType}</dd></>}
                    {p.wattage && <><dt className="muted">{p.partType === "psu" ? "Output" : "Power draw"}</dt><dd>{p.wattage}W</dd></>}
                    <dt className="muted">Item code</dt><dd>QG-{String(p.id).padStart(5, "0")}</dd>
                </dl>
            </section>

            <section id="reviews" className="mt-10 scroll-mt-24">
                <h2 className="mb-4 text-xl font-bold">Customer reviews</h2>
                <div className="grid gap-8 md:grid-cols-[240px_1fr]">
                    <div>
                        <p className="text-4xl font-bold">{reviews.length ? average.toFixed(1) : "–"}<span className="muted text-base font-normal"> / 5</span></p>
                        <Stars rating={Math.round(average)} size="size-5" />
                        <ul className="mt-4 space-y-1.5 text-sm">
                            {[5, 4, 3, 2, 1].map((n) => {
                                const count = reviews.filter((r) => r.rating === n).length;
                                return (
                                    <li key={n} className="grid grid-cols-[2rem_1fr_1.5rem] items-center gap-2">
                                        <span>{n}★</span>
                                        <span className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"><span className="block h-full rounded-full bg-amber-500" style={{ width: `${reviews.length ? (count / reviews.length) * 100 : 0}%` }} /></span>
                                        <span className="muted text-right">{count}</span>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                    <div>
                        {canReview ? <ReviewForm productId={p.id} myReview={myReview} onSaved={load} />
                            : <p className="muted mb-6 text-sm">{user ? "Reviews are written by customers who bought this product." : <><Link to={`/login?next=/product/${p.id}`} className="link">Sign in</Link> to review products you have bought.</>}</p>}
                        {reviews.length === 0 && <p className="muted">No reviews yet.</p>}
                        <ul className="divide-y divide-slate-200 dark:divide-slate-800">
                            {reviews.map((r) => (
                                <li key={r.id} className="py-4">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <Stars rating={r.rating} />
                                        <strong>{r.username}</strong>
                                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 dark:text-green-400"><BadgeCheck className="size-3.5" /> Verified purchase</span>
                                    </div>
                                    <p className="muted text-xs">{niceDate(r.createdAt)}{r.updatedAt ? " (edited)" : ""}</p>
                                    <p className="mt-2 whitespace-pre-line">{r.comment}</p>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </section>

            <div className="mt-12"><ProductRow title={`More in ${p.category}`} products={related} /></div>
        </>
    );
}

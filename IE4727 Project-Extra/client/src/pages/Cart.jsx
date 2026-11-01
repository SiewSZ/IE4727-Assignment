// Cart and checkout: review items, choose or add a delivery address, place the order.

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CircleCheck, MapPin, Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { api, money } from "../api.js";
import { useCart } from "../context/CartContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useCatalog } from "../context/CatalogContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { PageTitle, ProductImage } from "../components/Bits.jsx";

const DEFAULT_ADDRESSES = [
    { label: "Home", address: "50 Nanyang Ave, Singapore 639798" },
    { label: "Office", address: "1 Fusionopolis Way, Singapore 138632" }
];

function useAddresses() {
    const [list, setList] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem("qg-addresses")) || DEFAULT_ADDRESSES;
        } catch {
            return DEFAULT_ADDRESSES;
        }
    });
    useEffect(() => {
        try {
            localStorage.setItem("qg-addresses", JSON.stringify(list));
        } catch {
            // Not saved, but works until the page is closed
        }
    }, [list]);
    return [list, setList];
}

export default function Cart() {
    const { lines, totals, setQty, remove, clear } = useCart();
    const { user } = useAuth();
    const { reload } = useCatalog();
    const toast = useToast();
    const navigate = useNavigate();
    const [addresses, setAddresses] = useAddresses();
    const [chosen, setChosen] = useState(0);
    const [newAddress, setNewAddress] = useState({ label: "", address: "" });
    const [adding, setAdding] = useState(false);
    const [placing, setPlacing] = useState(false);
    const [error, setError] = useState("");
    const [placed, setPlaced] = useState(null);
    const [couponInput, setCouponInput] = useState("");
    const [coupon, setCoupon] = useState(null);
    const [couponError, setCouponError] = useState("");

    // Same rule as the server (db.js couponDiscount); the server works it out again at checkout
    const couponOff = !coupon || totals.total < coupon.minSpend ? 0
        : Math.round(Math.min(coupon.type === "percent" ? (totals.total * coupon.value) / 100 : coupon.value, totals.total) * 100) / 100;
    const payable = Math.round((totals.total - couponOff) * 100) / 100;

    const applyCoupon = async (e) => {
        e.preventDefault();
        const code = couponInput.trim();
        if (!code) return;
        setCouponError("");
        try {
            setCoupon(await api(`/orders/coupon/${encodeURIComponent(code)}`));
            setCouponInput("");
        } catch (err) {
            setCoupon(null);
            setCouponError(err.message);
        }
    };

    const saveAddress = (e) => {
        e.preventDefault();
        const label = newAddress.label.trim();
        const address = newAddress.address.trim();
        if (!label || address.length < 8) return toast("Please enter a label and the full address.", "error");
        setAddresses((list) => [...list, { label, address }]);
        setChosen(addresses.length);
        setNewAddress({ label: "", address: "" });
        setAdding(false);
    };

    const placeOrder = async () => {
        if (!user) return navigate("/login?next=/cart");
        setPlacing(true);
        setError("");
        try {
            const result = await api("/orders", {
                method: "POST",
                body: { items: lines.map((l) => ({ id: l.id, qty: l.qty })), addressLabel: addresses[chosen].label, address: addresses[chosen].address, couponCode: couponOff ? coupon.code : undefined }
            });
            setPlaced({ ...result, address: addresses[chosen] });
            clear();
            reload();   // stock changed
        } catch (err) {
            setError(err.message);
            reload();   // e.g. something sold out: show today's stock
        } finally {
            setPlacing(false);
        }
    };

    if (placed) {
        return (
            <div className="card mx-auto max-w-xl p-10 text-center">
                <CircleCheck className="mx-auto size-16 text-green-600 dark:text-green-400" />
                <h1 className="mt-4 text-2xl font-bold">Thank you! Order #{placed.orderId} is confirmed.</h1>
                <p className="muted mt-2">{placed.itemCount} item{placed.itemCount > 1 ? "s" : ""}, {money(placed.total)} in total{placed.couponOff > 0 ? ` (after your ${money(placed.couponOff)} coupon)` : ""}, will be delivered to <strong>{placed.address.label}</strong> ({placed.address.address}). A confirmation email is on its way.</p>
                <div className="mt-6 flex justify-center gap-3">
                    <Link to="/orders" className="btn-primary">Track this order</Link>
                    <Link to="/shop" className="btn-ghost">Continue shopping</Link>
                </div>
            </div>
        );
    }

    if (!lines.length) {
        return (
            <div className="card p-10 text-center">
                <ShoppingCart className="mx-auto size-14 text-slate-300 dark:text-slate-700" />
                <h1 className="mt-4 text-xl font-bold">Your cart is empty</h1>
                <Link to="/shop" className="btn-primary mt-4">Start shopping</Link>
            </div>
        );
    }

    return (
        <>
            <PageTitle icon={ShoppingCart} title="Cart and checkout" />
            <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
                <ul className="card divide-y divide-slate-200 dark:divide-slate-800">
                    {lines.map(({ id, qty, product: p }) => (
                        <li key={id} className="flex gap-4 p-4">
                            <Link to={`/product/${id}`} className="photo-box size-24 shrink-0"><ProductImage product={p} className="p-2" /></Link>
                            <div className="flex flex-1 flex-col gap-1">
                                <Link to={`/product/${id}`} className="font-semibold hover:text-brand-700 dark:hover:text-brand-300">{p.name}</Link>
                                <p className="muted text-sm">{p.category}</p>
                                <div className="mt-auto flex flex-wrap items-center gap-3">
                                    <div className="flex items-center rounded-lg border border-slate-300 dark:border-slate-700">
                                        <button onClick={() => setQty(id, qty - 1)} disabled={qty <= 1} className="p-2 disabled:opacity-30" aria-label="One fewer"><Minus className="size-4" /></button>
                                        <span className="w-8 text-center tabular-nums">{qty}</span>
                                        <button onClick={() => setQty(id, qty + 1)} disabled={qty >= p.stock} className="p-2 disabled:opacity-30" aria-label="One more"><Plus className="size-4" /></button>
                                    </div>
                                    <button onClick={() => remove(id)} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-red-600"><Trash2 className="size-4" /> Remove</button>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-bold">{money(p.price * qty)}</p>
                                {p.oldPrice > p.price && <s className="muted text-sm">{money(p.oldPrice * qty)}</s>}
                            </div>
                        </li>
                    ))}
                </ul>

                <aside className="space-y-4">
                    <section className="card space-y-3 p-5">
                        <h2 className="flex items-center gap-2 font-bold"><MapPin className="size-4" /> Deliver to</h2>
                        {addresses.map((a, i) => (
                            <label key={`${a.label}-${i}`} className={`flex cursor-pointer gap-3 rounded-xl border p-3 text-sm ${chosen === i ? "border-brand-600 bg-brand-50 dark:border-brand-400 dark:bg-slate-800" : "border-slate-200 dark:border-slate-800"}`}>
                                <input type="radio" name="address" checked={chosen === i} onChange={() => setChosen(i)} className="mt-1 accent-brand-700" />
                                <span><strong>{a.label}</strong><br /><span className="muted">{a.address}</span></span>
                            </label>
                        ))}
                        {adding ? (
                            <form onSubmit={saveAddress} className="space-y-2">
                                <input className="input" placeholder="Label (e.g. Hostel)" value={newAddress.label} onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })} maxLength={50} required aria-label="Address label" />
                                <input className="input" placeholder="Full address" value={newAddress.address} onChange={(e) => setNewAddress({ ...newAddress, address: e.target.value })} maxLength={255} required aria-label="Full address" />
                                <div className="flex gap-2"><button className="btn-primary flex-1">Save</button><button type="button" onClick={() => setAdding(false)} className="btn-ghost">Cancel</button></div>
                            </form>
                        ) : (
                            <button onClick={() => setAdding(true)} className="btn-ghost w-full">Add new address</button>
                        )}
                    </section>

                    <section className="card space-y-2 p-5 text-sm">
                        <h2 className="mb-2 font-bold">Order summary</h2>
                        <p className="flex justify-between"><span>Subtotal</span><span>{money(totals.subtotal)}</span></p>
                        <p className="flex justify-between text-green-700 dark:text-green-400"><span>Discount</span><span>-{money(totals.discount)}</span></p>
                        {coupon && (
                            <div className="flex items-start justify-between gap-2 text-green-700 dark:text-green-400">
                                <span>
                                    Coupon <strong>{coupon.code}</strong>
                                    <button onClick={() => setCoupon(null)} className="ml-2 text-xs text-slate-500 underline hover:text-red-600">remove</button>
                                    <span className="muted block text-xs">
                                        {couponOff ? coupon.description : `Spend ${money(coupon.minSpend - totals.total)} more to use this coupon.`}
                                    </span>
                                </span>
                                <span>-{money(couponOff)}</span>
                            </div>
                        )}
                        <p className="flex justify-between border-t border-slate-200 pt-2 text-lg font-bold dark:border-slate-800"><span>Total</span><span>{money(payable)}</span></p>
                        <form onSubmit={applyCoupon} className="flex gap-2 pt-1">
                            <input value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())} placeholder="Coupon code" maxLength={30} className="input py-2 uppercase" aria-label="Coupon code" />
                            <button className="btn-ghost">Apply</button>
                        </form>
                        {couponError && <p className="text-red-700 dark:text-red-400" role="alert">{couponError}</p>}
                        {!coupon && <p className="muted text-xs">Try <strong>WELCOME5</strong> for 5% off your first order.</p>}
                        {error && <p className="rounded-lg bg-red-600/10 p-3 text-red-700 dark:text-red-300" role="alert">{error}</p>}
                        <button onClick={placeOrder} disabled={placing} className="btn-primary w-full py-3 text-base">
                            {placing ? "Placing your order..." : user ? "Place order" : "Sign in to place order"}
                        </button>
                    </section>
                </aside>
            </div>
        </>
    );
}

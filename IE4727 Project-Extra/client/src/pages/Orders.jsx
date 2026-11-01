// My Orders: each order with a progress tracker, its items and totals.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CircleX, FileText, House, Package, PackageCheck, Receipt, Truck } from "lucide-react";
import { api, money, niceDate } from "../api.js";
import { PageTitle, Skeleton } from "../components/Bits.jsx";

const STEPS = [
    ["Pending", "Order placed", Receipt],
    ["Processing", "Packing", Package],
    ["Shipped", "On the way", Truck],
    ["Delivered", "Delivered", House]
];

function Tracker({ status }) {
    const current = STEPS.findIndex(([s]) => s === status);
    return (
        <ol className="grid grid-cols-4 px-2 py-5" aria-label="Order progress">
            {STEPS.map(([key, label, Icon], i) => {
                const reached = i <= current;
                return (
                    <li key={key} className="relative flex flex-col items-center gap-2 text-center" aria-current={i === current ? "step" : undefined}>
                        {i > 0 && <span className={`absolute top-5 right-1/2 h-1 w-full -z-0 ${reached ? "bg-green-600 dark:bg-green-500" : "bg-slate-200 dark:bg-slate-800"}`} />}
                        <span className={`relative z-10 grid size-10 place-items-center rounded-full border-2 ${reached ? "border-green-600 bg-green-600 text-white dark:border-green-500 dark:bg-green-500 dark:text-slate-950" : "border-slate-300 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-900"}`}>
                            <Icon className="size-5" aria-hidden="true" />
                        </span>
                        <span className={`text-xs font-semibold ${reached ? "" : "muted"}`}>{label}</span>
                    </li>
                );
            })}
        </ol>
    );
}

export default function Orders() {
    const [orders, setOrders] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        api("/orders/mine").then(setOrders).catch((err) => setError(err.message));
    }, []);

    return (
        <>
            <PageTitle icon={PackageCheck} title="My orders">Follow your orders from checkout to your door. We email you each time an order's status changes.</PageTitle>
            {error && <p className="card p-6 text-red-700 dark:text-red-300">{error}</p>}
            {!orders && !error && <Skeleton className="h-64" />}
            {orders?.length === 0 && (
                <div className="card p-10 text-center">
                    <p className="font-semibold">No orders yet.</p>
                    <Link to="/shop" className="btn-primary mt-4">Start shopping</Link>
                </div>
            )}
            <div className="space-y-6">
                {orders?.map((o) => (
                    <article key={o.id} className="card overflow-hidden">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4 dark:border-slate-800 dark:bg-slate-800/40">
                            <div>
                                <h2 className="font-bold">Order #{o.id}</h2>
                                <p className="muted text-sm">Placed {niceDate(o.placedAt)} · {o.items.reduce((s, i) => s + i.qty, 0)} items</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <Link to={`/orders/${o.id}/invoice`} className="btn-ghost py-1.5 text-sm"><FileText className="size-4" /> Invoice</Link>
                                <p className="text-lg font-bold">{money(o.total)}</p>
                            </div>
                        </div>
                        {o.status === "Cancelled"
                            ? <p className="m-5 flex items-center gap-2 rounded-lg bg-red-600/10 p-3 text-sm text-red-700 dark:text-red-300"><CircleX className="size-4" /> This order was cancelled and you were not charged.</p>
                            : <Tracker status={o.status} />}
                        <ul className="divide-y divide-slate-200 border-t border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                            {o.items.map((i) => (
                                <li key={`${o.id}-${i.name}`} className="flex items-center gap-4 px-5 py-3 text-sm">
                                    <span className="photo-box size-12 shrink-0">{i.image ? <img src={i.image} alt="" className="h-full w-full object-contain p-1" /> : null}</span>
                                    {i.productId ? <Link to={`/product/${i.productId}`} className="flex-1 font-semibold hover:underline">{i.name}</Link> : <span className="flex-1 font-semibold">{i.name}</span>}
                                    <span className="muted">{i.qty} × {money(i.price)}</span>
                                    <span className="w-24 text-right font-semibold">{money(i.qty * i.price)}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="muted border-t border-slate-200 px-5 py-3 text-sm dark:border-slate-800">
                            Delivering to <strong className="text-slate-900 dark:text-slate-100">{o.addressLabel}</strong>: {o.address}
                            {o.discount > 0 && <span className="ml-2 text-green-700 dark:text-green-400">· You saved {money(o.discount)}{o.couponCode ? ` (incl. coupon ${o.couponCode})` : ""}</span>}
                        </p>
                    </article>
                ))}
            </div>
        </>
    );
}

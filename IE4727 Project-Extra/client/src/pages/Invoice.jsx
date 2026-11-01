// A printable tax invoice for one of the customer's own orders. It is drawn like a sheet of paper
// (always white, whatever the theme), and printing hides the site's header and footer, so
// "Print / Save as PDF" gives a clean A4 page.

import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Printer } from "lucide-react";
import { api, money, niceDate } from "../api.js";
import { Skeleton } from "../components/Bits.jsx";

export default function Invoice() {
    const { id } = useParams();
    const [order, setOrder] = useState(undefined);   // undefined = loading, null = not one of yours
    const [customer, setCustomer] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        Promise.all([api("/orders/mine"), api("/auth/profile")])
            .then(([list, profile]) => {
                setCustomer(profile);
                setOrder(list.find((o) => String(o.id) === id) || null);
            })
            .catch((err) => setError(err.message));
    }, [id]);

    useEffect(() => {
        if (order) document.title = `Invoice QG-${String(order.id).padStart(6, "0")}`;
        return () => { document.title = "Quantum Gear"; };
    }, [order]);

    if (error) return <p className="card p-6 text-red-700 dark:text-red-300">{error}</p>;
    if (order === undefined) return <Skeleton className="h-[600px]" />;
    if (!order) {
        return (
            <div className="card p-10 text-center">
                <h1 className="text-xl font-bold">Invoice not found</h1>
                <p className="muted mt-2">You can only open invoices for your own orders.</p>
                <Link to="/orders" className="btn-primary mt-4">My orders</Link>
            </div>
        );
    }

    const number = `QG-${String(order.id).padStart(6, "0")}`;
    const productSavings = Math.round((order.discount - order.couponDiscount) * 100) / 100;   // discount = sale savings + coupon

    return (
        <>
            <div className="mb-4 flex flex-wrap justify-between gap-3 print:hidden">
                <Link to="/orders" className="btn-ghost"><ArrowLeft className="size-4" /> Back to my orders</Link>
                <button onClick={() => window.print()} className="btn-primary"><Printer className="size-4" /> Print / Save as PDF</button>
            </div>

            <article className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 text-slate-900 shadow-sm sm:p-12 print:max-w-none print:border-0 print:p-0 print:shadow-none">
                <header className="flex flex-wrap items-start justify-between gap-6 border-b border-slate-200 pb-6">
                    <div className="flex items-center gap-3">
                        <img src="/Images/Logo.png" alt="" className="h-12 w-auto" />
                        <div>
                            <p className="text-xl font-extrabold">Quantum<span className="text-brand-700">Gear</span></p>
                            <p className="text-sm text-slate-600">50 Nanyang Ave, Singapore 639798 · +65 6123 4567</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <h1 className="text-2xl font-bold tracking-tight">INVOICE</h1>
                        <p className="text-sm text-slate-600">No. <strong className="text-slate-900">{number}</strong></p>
                        <p className="text-sm text-slate-600">Date {niceDate(order.placedAt)}</p>
                        <p className={`mt-1 inline-block rounded px-2 py-0.5 text-xs font-bold ${order.status === "Cancelled" ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>
                            {order.status === "Cancelled" ? "CANCELLED, NOT CHARGED" : `STATUS: ${order.status.toUpperCase()}`}
                        </p>
                    </div>
                </header>

                <section className="grid gap-6 py-6 text-sm sm:grid-cols-2">
                    <div>
                        <p className="mb-1 text-xs font-bold tracking-wide text-slate-500 uppercase">Billed to</p>
                        <p className="font-semibold">{customer.username}</p>
                        <p className="text-slate-600">{customer.email}</p>
                    </div>
                    <div>
                        <p className="mb-1 text-xs font-bold tracking-wide text-slate-500 uppercase">Deliver to ({order.addressLabel})</p>
                        <p className="text-slate-600">{order.address}</p>
                    </div>
                </section>

                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-y border-slate-300 text-left text-xs text-slate-500 uppercase">
                            <th className="py-2">Item</th><th className="py-2 text-right">Qty</th><th className="py-2 text-right">Unit price</th><th className="py-2 text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {order.items.map((i) => (
                            <tr key={i.name} className="border-b border-slate-200">
                                <td className="py-2.5 pr-4">{i.name}</td>
                                <td className="py-2.5 text-right tabular-nums">{i.qty}</td>
                                <td className="py-2.5 text-right tabular-nums">{money(i.price)}</td>
                                <td className="py-2.5 text-right font-semibold tabular-nums">{money(i.price * i.qty)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <dl className="mt-6 ml-auto grid max-w-xs grid-cols-[1fr_auto] gap-x-6 gap-y-1.5 text-sm">
                    <dt className="text-slate-600">Regular price</dt><dd className="text-right tabular-nums">{money(order.subtotal)}</dd>
                    {productSavings > 0 && <><dt className="text-slate-600">Sale savings</dt><dd className="text-right text-green-700 tabular-nums">-{money(productSavings)}</dd></>}
                    {order.couponDiscount > 0 && <><dt className="text-slate-600">Coupon {order.couponCode}</dt><dd className="text-right text-green-700 tabular-nums">-{money(order.couponDiscount)}</dd></>}
                    <dt className="text-slate-600">Delivery</dt><dd className="text-right tabular-nums">Free</dd>
                    <dt className="mt-2 border-t border-slate-300 pt-2 text-base font-bold">Total paid</dt>
                    <dd className="mt-2 border-t border-slate-300 pt-2 text-right text-base font-bold tabular-nums">{money(order.total)}</dd>
                    <dt className="text-xs text-slate-500">of which GST (9%)</dt>
                    <dd className="text-right text-xs text-slate-500 tabular-nums">{money(order.total - order.total / 1.09)}</dd>
                </dl>

                <footer className="mt-10 border-t border-slate-200 pt-4 text-center text-xs text-slate-500">
                    Thank you for shopping with Quantum Gear. Prices include GST. Questions about this invoice? Quote {number} when you contact us.
                </footer>
            </article>
        </>
    );
}

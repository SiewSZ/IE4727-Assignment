// Admin dashboard: interactive charts (Recharts), orders with status updates, and a quick-edit
// inventory table. Admins only (the API checks the role on every request too).

import { useCallback, useEffect, useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Boxes, DollarSign, FileDown, LayoutDashboard, Package, Receipt, Search, TriangleAlert, Users } from "lucide-react";
import { api, money, niceDate } from "../api.js";
import { useToast } from "../context/ToastContext.jsx";
import { useCatalog } from "../context/CatalogContext.jsx";
import { PageTitle, Skeleton } from "../components/Bits.jsx";

const STATUSES = ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"];
const STATUS_COLOURS = {
    Pending: "bg-orange-500/15 text-orange-800 dark:text-orange-300",
    Processing: "bg-brand-500/15 text-brand-800 dark:text-brand-300",
    Shipped: "bg-violet-500/15 text-violet-800 dark:text-violet-300",
    Delivered: "bg-green-600/15 text-green-800 dark:text-green-300",
    Cancelled: "bg-red-600/15 text-red-700 dark:text-red-300"
};

// One series per chart, so one colour (sky-600 passes 3:1 contrast on white and on the dark card)
const SERIES = "#0284c7";
const tooltipStyle = { borderRadius: 12, border: "1px solid #cbd5e1", fontSize: 13 };

// Runs fn whenever the live connection reports a new order (CatalogContext fires qg:new-order)
function useOnNewOrder(fn) {
    useEffect(() => {
        window.addEventListener("qg:new-order", fn);
        return () => window.removeEventListener("qg:new-order", fn);
    }, [fn]);
}

function Kpi({ icon: Icon, label, value, note }) {
    return (
        <div className="card flex items-center gap-4 p-5">
            <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-slate-800 dark:text-brand-300"><Icon className="size-6" aria-hidden="true" /></span>
            <div>
                <p className="muted text-xs font-semibold tracking-wide uppercase">{label}</p>
                <p className="text-2xl font-bold tabular-nums">{value}</p>
                {note && <p className="muted text-xs">{note}</p>}
            </div>
        </div>
    );
}

function Dashboard() {
    const [days, setDays] = useState(30);
    const [stats, setStats] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        setStats(null);
        api(`/admin/stats?days=${days}`).then(setStats).catch((err) => setError(err.message));
    }, [days]);
    useOnNewOrder(useCallback(() => {
        api(`/admin/stats?days=${days}`).then(setStats).catch(() => {});
    }, [days]));

    if (error) return <p className="card p-6 text-red-700 dark:text-red-300">{error}</p>;
    if (!stats) return <div className="grid gap-4 md:grid-cols-4">{[1, 2, 3, 4].map((n) => <Skeleton key={n} className="h-28" />)}</div>;
    const { kpi } = stats;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2" role="group" aria-label="Period">
                {[7, 30, 90].map((d) => (
                    <button key={d} onClick={() => setDays(d)} aria-pressed={days === d} className={days === d ? "btn-primary py-1.5" : "btn-ghost py-1.5"}>{d} days</button>
                ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Kpi icon={DollarSign} label="Revenue" value={money(kpi.revenue)} note={`last ${days} days`} />
                <Kpi icon={Receipt} label="Orders" value={kpi.orders} note={`${money(kpi.avgOrder)} average · ${kpi.pending} pending`} />
                <Kpi icon={Package} label="Units sold" value={kpi.units} note={`${kpi.customers} customers`} />
                <Kpi icon={Users} label="Accounts" value={kpi.users} note={`${kpi.products} products in the shop`} />
            </div>

            <section className="card p-5">
                <h2 className="mb-1 font-bold">Revenue per day</h2>
                <p className="muted mb-4 text-sm">Cancelled orders don't count. Point at the chart for each day's numbers.</p>
                <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={stats.daily} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={SERIES} stopOpacity={0.35} />
                                    <stop offset="100%" stopColor={SERIES} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.12} vertical={false} />
                            <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} tick={{ fontSize: 12, fill: "currentColor" }} stroke="currentColor" strokeOpacity={0.3} minTickGap={24} />
                            <YAxis tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`} tick={{ fontSize: 12, fill: "currentColor" }} stroke="currentColor" strokeOpacity={0.3} width={56} />
                            <Tooltip contentStyle={tooltipStyle} labelFormatter={(d) => niceDate(d)} formatter={(v, name) => (name === "revenue" ? [money(v), "Revenue"] : [v, "Orders"])} />
                            <Area type="monotone" dataKey="revenue" stroke={SERIES} strokeWidth={2} fill="url(#rev)" isAnimationActive={false} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
                <section className="card p-5">
                    <h2 className="mb-4 font-bold">Revenue by category</h2>
                    {stats.byCategory.length ? (
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.byCategory} layout="vertical" margin={{ left: 10, right: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.12} horizontal={false} />
                                    <XAxis type="number" tickFormatter={(v) => `$${v}`} tick={{ fontSize: 12, fill: "currentColor" }} stroke="currentColor" strokeOpacity={0.3} />
                                    <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12, fill: "currentColor" }} stroke="currentColor" strokeOpacity={0.3} />
                                    <Tooltip contentStyle={tooltipStyle} formatter={(v) => [money(v), "Revenue"]} cursor={{ fillOpacity: 0.08 }} />
                                    <Bar dataKey="revenue" fill={SERIES} radius={[0, 4, 4, 0]} barSize={18} isAnimationActive={false} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : <p className="muted text-sm">No sales in this period yet.</p>}
                </section>

                <section className="card p-5">
                    <h2 className="mb-4 font-bold">Top products (units sold)</h2>
                    {stats.topProducts.length ? (
                        <table className="w-full text-sm">
                            <thead><tr className="muted text-left text-xs uppercase"><th className="pb-2">Product</th><th className="pb-2 text-right">Units</th><th className="pb-2 text-right">Revenue</th></tr></thead>
                            <tbody>
                                {stats.topProducts.map((p) => (
                                    <tr key={p.name} className="border-t border-slate-200 dark:border-slate-800">
                                        <td className="py-2 pr-2">{p.name}</td><td className="py-2 text-right tabular-nums">{p.units}</td><td className="py-2 text-right tabular-nums">{money(p.revenue)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : <p className="muted text-sm">No sales in this period yet.</p>}

                    <h2 className="mt-6 mb-3 flex items-center gap-2 font-bold"><TriangleAlert className="size-4 text-orange-600" /> Low stock</h2>
                    {stats.lowStock.length ? (
                        <ul className="flex flex-wrap gap-2">
                            {stats.lowStock.map((p) => (
                                <li key={p.id} className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${p.stock === 0 ? STATUS_COLOURS.Cancelled : STATUS_COLOURS.Pending}`}>{p.name}: {p.stock === 0 ? "out" : `${p.stock} left`}</li>
                            ))}
                        </ul>
                    ) : <p className="muted text-sm">Everything has more than 5 in stock.</p>}
                </section>
            </div>
        </div>
    );
}

function OrdersTab() {
    const [orders, setOrders] = useState(null);
    const [filter, setFilter] = useState("");
    const [search, setSearch] = useState("");
    const toast = useToast();
    const { reload } = useCatalog();

    const load = useCallback(() => api("/admin/orders").then(setOrders).catch((err) => toast(err.message, "error")), [toast]);
    useEffect(() => { load(); }, [load]);
    useOnNewOrder(load);

    const change = async (order, status) => {
        if (status === "Cancelled" && !confirm(`Cancel order #${order.id}? Its items go back into stock, and it can't be reopened.`)) return;
        try {
            await api(`/admin/orders/${order.id}`, { method: "PATCH", body: { status } });
            toast(`Order #${order.id} is now ${status}. The customer has been emailed.`);
            load();
            if (status === "Cancelled") reload();
        } catch (err) {
            toast(err.message, "error");
        }
    };

    if (!orders) return <Skeleton className="h-64" />;
    const term = search.trim().toLowerCase().replace(/^#/, "");
    const shown = orders.filter((o) => (!filter || o.status === filter) && (!term || `${o.id} ${o.customer} ${o.email}`.toLowerCase().includes(term)));

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
                <label className="relative flex-1"><Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by order # or customer..." className="input pl-9" aria-label="Search orders" /></label>
                <select value={filter} onChange={(e) => setFilter(e.target.value)} className="input w-auto" aria-label="Filter by status"><option value="">All statuses</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
                {/* A normal download link: the browser sends the session cookie and saves the file */}
                <a href="/api/admin/orders.csv" download className="btn-ghost"><FileDown className="size-4" /> Export CSV</a>
            </div>
            <div className="card overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800/50"><tr className="muted text-left text-xs uppercase">
                        <th className="p-3">Order</th><th className="p-3">Customer</th><th className="p-3">Date</th><th className="p-3">Items</th><th className="p-3">Total</th><th className="p-3">Status</th>
                    </tr></thead>
                    <tbody>
                        {shown.map((o) => (
                            <tr key={o.id} className="border-t border-slate-200 dark:border-slate-800">
                                <td className="p-3 font-bold">#{o.id}</td>
                                <td className="p-3">{o.customer}<span className="muted block text-xs">{o.email}</span></td>
                                <td className="p-3">{niceDate(o.placedAt)}</td>
                                <td className="p-3">{o.items}</td>
                                <td className="p-3 font-semibold">{money(o.total)}</td>
                                <td className="p-3">
                                    {o.status === "Cancelled" ? <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_COLOURS.Cancelled}`}>Cancelled</span> : (
                                        <select value={o.status} onChange={(e) => change(o, e.target.value)} className={`rounded-full border-0 px-2.5 py-1 text-xs font-bold ${STATUS_COLOURS[o.status]}`} aria-label={`Status of order ${o.id}`}>
                                            {STATUSES.map((s) => <option key={s} className="text-slate-900">{s}</option>)}
                                        </select>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {!shown.length && <tr><td colSpan={6} className="muted p-6 text-center">{orders.length ? "No orders match." : "No orders yet."}</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function InventoryRow({ product, onSaved }) {
    const toast = useToast();
    const [form, setForm] = useState({ price: product.price, oldPrice: product.oldPrice ?? "", stock: product.stock, isActive: product.isActive });
    const changed = form.price !== product.price || (form.oldPrice === "" ? null : Number(form.oldPrice)) !== product.oldPrice || Number(form.stock) !== product.stock || form.isActive !== product.isActive;

    const save = async () => {
        try {
            await api(`/admin/products/${product.id}`, { method: "PATCH", body: { price: Number(form.price), oldPrice: form.oldPrice === "" ? null : Number(form.oldPrice), stock: Number(form.stock), isActive: form.isActive } });
            toast(`${product.name} saved.`);
            onSaved();
        } catch (err) {
            toast(err.message, "error");
        }
    };

    const num = "input w-24 py-1.5 text-right";
    return (
        <tr className="border-t border-slate-200 dark:border-slate-800">
            <td className="p-3"><span className="font-semibold">{product.name}</span><span className="muted block text-xs">{product.category}</span></td>
            <td className="p-3"><input type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} className={num} aria-label={`Price of ${product.name}`} /></td>
            <td className="p-3"><input type="number" min="0" step="0.01" value={form.oldPrice} onChange={(e) => setForm({ ...form, oldPrice: e.target.value })} placeholder="–" className={num} aria-label={`Regular price of ${product.name} (blank = not on sale)`} /></td>
            <td className="p-3"><input type="number" min="0" step="1" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className={`${num} ${Number(form.stock) <= 5 ? "border-orange-500" : ""}`} aria-label={`Stock of ${product.name}`} /></td>
            <td className="p-3 text-center"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="size-4 accent-brand-700" aria-label={`Show ${product.name} in the shop`} /></td>
            <td className="p-3 text-right"><button onClick={save} disabled={!changed} className="btn-primary py-1.5">Save</button></td>
        </tr>
    );
}

function InventoryTab() {
    const [products, setProducts] = useState(null);
    const [search, setSearch] = useState("");
    const { reload } = useCatalog();
    const load = useCallback(() => api("/admin/products").then(setProducts), []);
    useEffect(() => { load(); }, [load]);

    const shown = useMemo(() => (products || []).filter((p) => `${p.name} ${p.brand} ${p.category}`.toLowerCase().includes(search.toLowerCase())), [products, search]);
    if (!products) return <Skeleton className="h-64" />;

    return (
        <div className="space-y-4">
            <label className="relative block"><Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..." className="input pl-9" aria-label="Search products" /></label>
            <p className="muted text-sm">Edit a price, regular price (for a sale), stock or visibility, then Save. To end a sale, clear the regular price.</p>
            <div className="card overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800/50"><tr className="muted text-left text-xs uppercase">
                        <th className="p-3">Product</th><th className="p-3">Price</th><th className="p-3">Regular price</th><th className="p-3">Stock</th><th className="p-3 text-center">In shop</th><th className="p-3" />
                    </tr></thead>
                    <tbody>{shown.map((p) => <InventoryRow key={`${p.id}-${p.price}-${p.oldPrice}-${p.stock}-${p.isActive}`} product={p} onSaved={() => { load(); reload(); }} />)}</tbody>
                </table>
            </div>
        </div>
    );
}

const TABS = [["dashboard", "Dashboard", LayoutDashboard], ["orders", "Orders", Receipt], ["inventory", "Inventory", Boxes]];

export default function Admin() {
    const [tab, setTab] = useState("dashboard");
    return (
        <>
            <PageTitle icon={LayoutDashboard} title="Admin dashboard">Live sales numbers, orders and stock.</PageTitle>
            <div className="mb-6 flex gap-2 border-b border-slate-200 dark:border-slate-800" role="tablist">
                {TABS.map(([key, label, Icon]) => (
                    <button key={key} role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
                        className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold ${tab === key ? "border-brand-600 text-brand-700 dark:border-brand-400 dark:text-brand-300" : "muted border-transparent"}`}>
                        <Icon className="size-4" /> {label}
                    </button>
                ))}
            </div>
            {tab === "dashboard" && <Dashboard />}
            {tab === "orders" && <OrdersTab />}
            {tab === "inventory" && <InventoryTab />}
        </>
    );
}

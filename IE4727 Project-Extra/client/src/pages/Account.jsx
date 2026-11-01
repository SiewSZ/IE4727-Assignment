// My Account: who you are, what you've bought and saved, and a form to change your password.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Heart, KeyRound, Package, PiggyBank, Tag, UserRound, Wallet } from "lucide-react";
import { api, money, niceDate } from "../api.js";
import { useLists } from "../context/ListsContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { PageTitle, Skeleton } from "../components/Bits.jsx";

function Stat({ icon: Icon, label, value }) {
    return (
        <div className="card flex items-center gap-3 p-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-slate-800 dark:text-brand-300"><Icon className="size-5" aria-hidden="true" /></span>
            <div>
                <p className="muted text-xs font-semibold uppercase">{label}</p>
                <p className="text-lg font-bold tabular-nums">{value}</p>
            </div>
        </div>
    );
}

function PasswordForm() {
    const toast = useToast();
    const [form, setForm] = useState({ current: "", next: "", again: "" });
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);
    const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

    const submit = async (e) => {
        e.preventDefault();
        if (form.next.length < 8) return setError("Your new password needs at least 8 characters.");
        if (form.next !== form.again) return setError("The two new passwords don't match.");
        setSaving(true);
        setError("");
        try {
            await api("/auth/password", { method: "POST", body: { current: form.current, next: form.next } });
            setForm({ current: "", next: "", again: "" });
            toast("Your password has been changed.");
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={submit} className="card space-y-3 p-6" noValidate>
            <h2 className="flex items-center gap-2 font-bold"><KeyRound className="size-4" /> Change password</h2>
            <label className="block text-sm font-semibold">Current password
                <input type="password" autoComplete="current-password" value={form.current} onChange={set("current")} className="input mt-1" required />
            </label>
            <label className="block text-sm font-semibold">New password <span className="muted font-normal">(at least 8 characters)</span>
                <input type="password" autoComplete="new-password" value={form.next} onChange={set("next")} className="input mt-1" minLength={8} required />
            </label>
            <label className="block text-sm font-semibold">New password again
                <input type="password" autoComplete="new-password" value={form.again} onChange={set("again")} className="input mt-1" required />
            </label>
            {error && <p className="text-sm text-red-700 dark:text-red-400" role="alert">{error}</p>}
            <button disabled={saving || !form.current || !form.next} className="btn-primary">{saving ? "Saving..." : "Change password"}</button>
        </form>
    );
}

export default function Account() {
    const [profile, setProfile] = useState(null);
    const [error, setError] = useState("");
    const { wishlist } = useLists();

    useEffect(() => {
        api("/auth/profile").then(setProfile).catch((err) => setError(err.message));
    }, []);

    if (error) return <p className="card p-6 text-red-700 dark:text-red-300">{error}</p>;
    if (!profile) return <Skeleton className="h-96" />;

    return (
        <>
            <PageTitle icon={UserRound} title="My account">Signed in as <strong>{profile.username}</strong> ({profile.email}){profile.role === "admin" ? ", administrator" : ""}.</PageTitle>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Stat icon={Package} label="Orders" value={profile.orders} />
                <Stat icon={Wallet} label="Total spent" value={money(profile.spent)} />
                <Stat icon={PiggyBank} label="Total saved" value={money(profile.saved)} />
                <Stat icon={Tag} label="Favourite category" value={profile.favouriteCategory || "None yet"} />
                <Stat icon={Heart} label="Wishlist" value={`${wishlist.length} saved`} />
                <Stat icon={CalendarDays} label="Member since" value={niceDate(profile.joined)} />
            </div>
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <PasswordForm />
                <section className="card space-y-3 p-6 text-sm">
                    <h2 className="font-bold">Shortcuts</h2>
                    <p><Link to="/orders" className="link">My orders</Link>: track deliveries and print invoices.</p>
                    <p><Link to="/wishlist" className="link">Wishlist</Link>: items you saved for later.</p>
                    <p><Link to="/builder" className="link">PC Builder</Link>: plan a full build with compatibility checks.</p>
                    {profile.lastLogin && <p className="muted pt-2">Last sign-in: {niceDate(profile.lastLogin)}</p>}
                </section>
            </div>
        </>
    );
}

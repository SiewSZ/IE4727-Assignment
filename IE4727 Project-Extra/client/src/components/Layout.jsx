// The frame around every page: header with navigation, the page itself, footer, cart drawer
// and the Ctrl+K search.

import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { CircleUserRound, Download, Heart, LayoutDashboard, LogOut, Menu, Moon, Package, Scale, Search, ShoppingCart, Sun, User, WifiOff, X } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useCart } from "../context/CartContext.jsx";
import { useLists } from "../context/ListsContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { useCatalog } from "../context/CatalogContext.jsx";
import CartDrawer from "./CartDrawer.jsx";
import CommandPalette from "./CommandPalette.jsx";

const NAV = [
    ["/", "Home"],
    ["/shop", "Shop"],
    ["/deals", "Hot Deals"],
    ["/builder", "PC Builder"],
    ["/compare", "Compare"]
];

// Offers "Install app" when the browser allows it (Chrome/Edge fire beforeinstallprompt once the
// service worker and manifest are in place). Hidden once installed, and in browsers without it.
function useInstallPrompt() {
    const [prompt, setPrompt] = useState(null);
    useEffect(() => {
        const keep = (e) => { e.preventDefault(); setPrompt(e); };
        const done = () => setPrompt(null);
        window.addEventListener("beforeinstallprompt", keep);
        window.addEventListener("appinstalled", done);
        return () => {
            window.removeEventListener("beforeinstallprompt", keep);
            window.removeEventListener("appinstalled", done);
        };
    }, []);
    if (!prompt) return null;
    return async () => {
        prompt.prompt();
        await prompt.userChoice;
        setPrompt(null);
    };
}

function useOnline() {
    const [online, setOnline] = useState(() => navigator.onLine);
    useEffect(() => {
        const on = () => setOnline(true);
        const off = () => setOnline(false);
        window.addEventListener("online", on);
        window.addEventListener("offline", off);
        return () => {
            window.removeEventListener("online", on);
            window.removeEventListener("offline", off);
        };
    }, []);
    return online;
}

function ThemeSwitch() {
    const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
    const toggle = () => {
        const next = !dark;
        document.documentElement.classList.toggle("dark", next);
        try {
            localStorage.setItem("theme", next ? "dark" : "light");
        } catch {
            // Not saved, but the switch still works on this page
        }
        setDark(next);
    };
    return (
        <button onClick={toggle} role="switch" aria-checked={!dark} aria-label="Light mode" title={dark ? "Switch to light mode" : "Switch to dark mode"} className="btn-ghost p-2.5">
            {dark ? <Sun className="size-5" /> : <Moon className="size-5" />}
        </button>
    );
}

export default function Layout() {
    const { user, isAdmin, logout } = useAuth();
    const { totals, setOpen } = useCart();
    const { wishlist, compare } = useLists();
    const toast = useToast();
    const location = useLocation();
    const [searchOpen, setSearchOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const install = useInstallPrompt();
    const online = useOnline();
    const { live } = useCatalog();

    // Ctrl+K, ⌘K or "/" opens the quick search from anywhere (except while typing in a field)
    useEffect(() => {
        const onKey = (e) => {
            const typing = ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName);
            if ((e.key.toLowerCase() === "k" && (e.ctrlKey || e.metaKey)) || (e.key === "/" && !typing)) {
                e.preventDefault();
                setSearchOpen(true);
            }
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, []);

    // New page: close the mobile menu and start at the top
    useEffect(() => {
        setMenuOpen(false);
        window.scrollTo({ top: 0 });
    }, [location.pathname]);

    const signOut = async () => {
        await logout();
        toast("You are signed out.", "info");
    };

    const navClass = ({ isActive }) =>
        `rounded-lg px-3 py-2 text-sm font-semibold transition ${isActive ? "bg-brand-700 text-white dark:bg-brand-400 dark:text-slate-950" : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`;

    return (
        <div className="flex min-h-screen flex-col">
            <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-white focus:p-2">Skip to content</a>

            <header className="sticky top-0 z-40 print:hidden border-b border-slate-200 bg-white/85 backdrop-blur dark:border-slate-800 dark:bg-slate-950/85">
                <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
                    <button onClick={() => setMenuOpen((o) => !o)} className="btn-ghost p-2.5 lg:hidden" aria-label="Menu" aria-expanded={menuOpen}>
                        {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
                    </button>
                    <Link to="/" className="flex items-center gap-2" aria-label="Quantum Gear home">
                        <img src="/Images/Logo.png" alt="" className="h-10 w-auto" />
                        <span className="hidden text-lg font-extrabold tracking-tight sm:inline">Quantum<span className="text-brand-700 dark:text-brand-400">Gear</span></span>
                    </Link>

                    <nav className="ml-4 hidden gap-1 lg:flex" aria-label="Main">
                        {NAV.map(([to, label]) => <NavLink key={to} to={to} end={to === "/"} className={navClass}>{label}</NavLink>)}
                    </nav>

                    <div className="ml-auto flex items-center gap-2">
                        <button onClick={() => setSearchOpen(true)} className="btn-ghost hidden w-56 justify-between text-slate-500 md:inline-flex" aria-label="Search products (Ctrl+K)">
                            <span className="flex items-center gap-2"><Search className="size-4" /> Search...</span>
                            <kbd className="rounded border border-slate-300 px-1.5 text-xs dark:border-slate-700">Ctrl K</kbd>
                        </button>
                        <button onClick={() => setSearchOpen(true)} className="btn-ghost p-2.5 md:hidden" aria-label="Search products"><Search className="size-5" /></button>
                        {install && <button onClick={install} className="btn-ghost hidden p-2.5 sm:inline-flex" title="Install the Quantum Gear app" aria-label="Install app"><Download className="size-5" /></button>}
                        <ThemeSwitch />
                        <Link to="/wishlist" className="btn-ghost relative p-2.5" aria-label={`Wishlist, ${wishlist.length} saved`}>
                            <Heart className="size-5" />
                            {wishlist.length > 0 && <span className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-red-600 text-[0.65rem] font-bold text-white">{wishlist.length}</span>}
                        </Link>
                        <button onClick={() => setOpen(true)} className="btn-ghost relative p-2.5" aria-label={`Cart, ${totals.count} items`}>
                            <ShoppingCart className="size-5" />
                            {totals.count > 0 && <span className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-brand-700 text-[0.65rem] font-bold text-white dark:bg-brand-400 dark:text-slate-950">{totals.count}</span>}
                        </button>
                        {user ? (
                            <div className="flex items-center gap-1">
                                <Link to="/orders" className="btn-ghost hidden p-2.5 sm:inline-flex" title="My orders" aria-label="My orders"><Package className="size-5" /></Link>
                                <Link to="/account" className="btn-ghost hidden p-2.5 sm:inline-flex" title={`My account (${user.username})`} aria-label="My account"><CircleUserRound className="size-5" /></Link>
                                {isAdmin && <Link to="/admin" className="btn-ghost p-2.5" title="Admin dashboard" aria-label="Admin dashboard"><LayoutDashboard className="size-5" /></Link>}
                                <button onClick={signOut} className="btn-ghost p-2.5" title={`Sign out ${user.username}`} aria-label="Sign out"><LogOut className="size-5" /></button>
                            </div>
                        ) : (
                            <Link to="/login" className="btn-primary"><User className="size-4" /> <span className="hidden sm:inline">Sign in</span></Link>
                        )}
                    </div>
                </div>

                {menuOpen && (
                    <nav className="border-t border-slate-200 px-4 py-3 lg:hidden dark:border-slate-800" aria-label="Main">
                        <div className="flex flex-col gap-1">
                            {NAV.map(([to, label]) => <NavLink key={to} to={to} end={to === "/"} className={navClass}>{label}</NavLink>)}
                            {user && <NavLink to="/orders" className={navClass}>My Orders</NavLink>}
                            {user && <NavLink to="/account" className={navClass}>My Account</NavLink>}
                            {install && <button onClick={install} className="rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">Install app</button>}
                        </div>
                    </nav>
                )}
                {!online && (
                    <p className="flex items-center justify-center gap-2 bg-amber-100 px-4 py-2 text-center text-sm font-semibold text-amber-900 dark:bg-amber-500/15 dark:text-amber-200" role="status">
                        <WifiOff className="size-4" /> You are offline. You can still browse the catalogue; sign-in and checkout come back when you reconnect.
                    </p>
                )}
            </header>

            {compare.length > 0 && location.pathname !== "/compare" && (
                <Link to="/compare" className="fixed bottom-4 left-4 z-30 btn-primary shadow-lg print:hidden">
                    <Scale className="size-4" /> Compare ({compare.length})
                </Link>
            )}

            <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">
                <Outlet />
            </main>

            <footer className="print:hidden border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                        <p className="text-lg font-extrabold">Quantum<span className="text-brand-700 dark:text-brand-400">Gear</span></p>
                        <p className="muted mt-2 text-sm">PC parts and consumer electronics, delivered island-wide.</p>
                    </div>
                    <div className="text-sm">
                        <p className="mb-2 font-bold">Shop</p>
                        <ul className="muted space-y-1">
                            <li><Link to="/shop" className="hover:underline">All products</Link></li>
                            <li><Link to="/deals" className="hover:underline">Hot Deals</Link></li>
                            <li><Link to="/builder" className="hover:underline">PC Builder</Link></li>
                        </ul>
                    </div>
                    <div className="text-sm">
                        <p className="mb-2 font-bold">Your account</p>
                        <ul className="muted space-y-1">
                            <li><Link to="/account" className="hover:underline">My account</Link></li>
                            <li><Link to="/orders" className="hover:underline">My orders</Link></li>
                            <li><Link to="/wishlist" className="hover:underline">Wishlist</Link></li>
                            <li><Link to="/compare" className="hover:underline">Compare</Link></li>
                        </ul>
                    </div>
                    <div className="muted text-sm">
                        <p className="mb-2 font-bold text-slate-900 dark:text-slate-100">Visit us</p>
                        <p>50 Nanyang Ave, Singapore</p>
                        <p>+65 6123 4567</p>
                        <p>Mon - Sat, 10:00 AM - 7:00 PM</p>
                    </div>
                </div>
                <p className="muted border-t border-slate-200 py-4 text-center text-xs dark:border-slate-800">
                    © 2026 Quantum Gear · React + Node.js edition ·{" "}
                    <span title="Stock numbers update by themselves when anyone buys something">
                        <span className={`inline-block size-2 rounded-full ${live ? "bg-green-600" : "bg-slate-400"}`} aria-hidden="true" /> {live ? "Live stock" : "Connecting..."}
                    </span>{" "}· Press <kbd className="rounded border px-1">Ctrl K</kbd> to search
                </p>
            </footer>

            <CartDrawer />
            <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
        </div>
    );
}

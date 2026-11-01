// Entry point: providers (shared state) around the router. Each page is loaded only when it is
// first opened (React.lazy), so the first visit downloads less.

import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import "./index.css";
import { ToastProvider } from "./context/ToastContext.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { CatalogProvider } from "./context/CatalogContext.jsx";
import { CartProvider } from "./context/CartContext.jsx";
import { ListsProvider } from "./context/ListsContext.jsx";
import Layout from "./components/Layout.jsx";
import RequireAuth from "./components/RequireAuth.jsx";
import { Skeleton } from "./components/Bits.jsx";
import Home from "./pages/Home.jsx";

const Shop = lazy(() => import("./pages/Shop.jsx"));
const Deals = lazy(() => import("./pages/Deals.jsx"));
const ProductPage = lazy(() => import("./pages/ProductPage.jsx"));
const Cart = lazy(() => import("./pages/Cart.jsx"));
const Login = lazy(() => import("./pages/Login.jsx"));
const Orders = lazy(() => import("./pages/Orders.jsx"));
const Wishlist = lazy(() => import("./pages/Wishlist.jsx"));
const Compare = lazy(() => import("./pages/Compare.jsx"));
const Builder = lazy(() => import("./pages/Builder.jsx"));
const Admin = lazy(() => import("./pages/Admin.jsx"));

const Account = lazy(() => import("./pages/Account.jsx"));
const Invoice = lazy(() => import("./pages/Invoice.jsx"));

// Installable app + offline browsing (public/sw.js). Only in the built app: during development
// a service worker would keep serving old files while Vite reloads new ones.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
}

function NotFound() {
    return (
        <div className="card p-10 text-center">
            <h1 className="text-2xl font-bold">Page not found</h1>
            <p className="muted mt-2">That page doesn't exist.</p>
            <Link to="/" className="btn-primary mt-4">Go home</Link>
        </div>
    );
}

createRoot(document.getElementById("root")).render(
    <StrictMode>
        <BrowserRouter>
            <ToastProvider>
                <AuthProvider>
                    <CatalogProvider>
                        <CartProvider>
                            <ListsProvider>
                                <Suspense fallback={<div className="mx-auto max-w-7xl p-8"><Skeleton className="h-96" /></div>}>
                                    <Routes>
                                        <Route element={<Layout />}>
                                            <Route index element={<Home />} />
                                            <Route path="shop" element={<Shop />} />
                                            <Route path="deals" element={<Deals />} />
                                            <Route path="product/:id" element={<ProductPage />} />
                                            <Route path="cart" element={<Cart />} />
                                            <Route path="login" element={<Login />} />
                                            <Route path="orders" element={<RequireAuth><Orders /></RequireAuth>} />
                                            <Route path="orders/:id/invoice" element={<RequireAuth><Invoice /></RequireAuth>} />
                                            <Route path="account" element={<RequireAuth><Account /></RequireAuth>} />
                                            <Route path="wishlist" element={<Wishlist />} />
                                            <Route path="compare" element={<Compare />} />
                                            <Route path="builder" element={<Builder />} />
                                            <Route path="admin" element={<RequireAuth admin><Admin /></RequireAuth>} />
                                            <Route path="*" element={<NotFound />} />
                                        </Route>
                                    </Routes>
                                </Suspense>
                            </ListsProvider>
                        </CartProvider>
                    </CatalogProvider>
                </AuthProvider>
            </ToastProvider>
        </BrowserRouter>
    </StrictMode>
);

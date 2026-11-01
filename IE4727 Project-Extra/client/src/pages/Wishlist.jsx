// Wishlist: products saved for later (stored on the server for the signed-in customer).

import { Link } from "react-router-dom";
import { Heart, ShoppingCart } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useLists } from "../context/ListsContext.jsx";
import { useCatalog } from "../context/CatalogContext.jsx";
import { useCart } from "../context/CartContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import ProductCard from "../components/ProductCard.jsx";
import { PageTitle } from "../components/Bits.jsx";

export default function Wishlist() {
    const { user } = useAuth();
    const { wishlist } = useLists();
    const { byId } = useCatalog();
    const { add } = useCart();
    const toast = useToast();
    const items = wishlist.map((id) => byId.get(id)).filter(Boolean);
    const inStock = items.filter((p) => p.stock > 0);

    const addAll = () => {
        inStock.forEach((p) => add(p));
        toast(`${inStock.length} product${inStock.length > 1 ? "s" : ""} added to your cart.`);
    };

    if (!user) {
        return (
            <div className="card p-10 text-center">
                <Heart className="mx-auto size-12 text-slate-300 dark:text-slate-700" />
                <h1 className="mt-4 text-xl font-bold">Save products for later</h1>
                <p className="muted mt-2">Sign in and tap the heart on any product to keep it in your wishlist.</p>
                <Link to="/login?next=/wishlist" className="btn-primary mt-4">Sign in</Link>
            </div>
        );
    }

    return (
        <>
            <PageTitle icon={Heart} title="Wishlist">Products you saved for later. Prices and stock are always up to date.</PageTitle>
            {items.length === 0 ? (
                <div className="card p-10 text-center">
                    <p className="font-semibold">Your wishlist is empty.</p>
                    <Link to="/shop" className="btn-primary mt-4">Find something you like</Link>
                </div>
            ) : (
                <>
                    {inStock.length > 0 && <button onClick={addAll} className="btn-primary mb-4"><ShoppingCart className="size-4" /> Add all in-stock items to cart</button>}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {items.map((p) => <ProductCard key={p.id} product={p} />)}
                    </div>
                </>
            )}
        </>
    );
}

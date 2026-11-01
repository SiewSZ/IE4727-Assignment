// A product in a grid: photo, badges, name, rating, price, Add to Cart, wishlist heart and compare.

import { Link } from "react-router-dom";
import { Flame, Heart, Scale, ShoppingCart } from "lucide-react";
import { Price, ProductImage, SaleBadge, Stars } from "./Bits.jsx";
import { useCart } from "../context/CartContext.jsx";
import { useLists } from "../context/ListsContext.jsx";
import { useCatalog } from "../context/CatalogContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { money } from "../api.js";

export default function ProductCard({ product }) {
    const { add } = useCart();
    const { wishlist, toggleWishlist, compare, toggleCompare } = useLists();
    const { bestsellerIds } = useCatalog();
    const toast = useToast();
    const saved = wishlist.includes(product.id);
    const comparing = compare.includes(product.id);
    const inStock = product.stock > 0;

    const addToCart = () => {
        add(product);
        toast(`${product.name} added to your cart.`);
    };

    return (
        <article className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg">
            <div className="relative">
                <Link to={`/product/${product.id}`} className="block aspect-square bg-white">
                    <ProductImage product={product} className="transition duration-300 group-hover:scale-105" />
                </Link>
                <SaleBadge product={product} className="absolute top-3 left-3" />
                <button
                    onClick={() => toggleWishlist(product)}
                    aria-label={saved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
                    aria-pressed={saved}
                    className="absolute top-3 right-3 grid size-9 place-items-center rounded-full bg-white/90 text-slate-700 shadow hover:text-red-600"
                >
                    <Heart className={`size-5 ${saved ? "fill-red-600 text-red-600" : ""}`} />
                </button>
            </div>

            <div className="flex flex-1 flex-col gap-1.5 p-4">
                <p className="flex flex-wrap items-center gap-2 text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
                    {product.category}
                    {bestsellerIds.has(product.id) && (
                        <span className="inline-flex items-center gap-1 rounded bg-orange-100 px-1.5 py-0.5 text-[0.7rem] text-orange-800 normal-case dark:bg-orange-500/15 dark:text-orange-300">
                            <Flame className="size-3" aria-hidden="true" /> Bestseller
                        </span>
                    )}
                </p>
                <h3 className="line-clamp-2 min-h-12 font-semibold">
                    <Link to={`/product/${product.id}`} className="hover:text-brand-700 dark:hover:text-brand-300">{product.name}</Link>
                </h3>
                <div className="flex items-center gap-2 text-xs">
                    <Stars rating={product.rating} size="size-3.5" />
                    <span className="muted">{product.reviews} reviews</span>
                </div>
                <Price product={product} />
                {/* The line is kept (empty) when not on sale, so prices and stock line up across a row */}
                <p className="min-h-5 text-sm font-semibold text-green-700 dark:text-green-400">
                    {product.oldPrice > product.price && `You save ${money(product.oldPrice - product.price)}`}
                </p>
                <p className={`text-xs font-medium ${!inStock ? "text-red-600 dark:text-red-400" : product.stock <= 5 ? "text-orange-700 dark:text-orange-300" : "muted"}`}>
                    {!inStock ? "Out of stock" : product.stock <= 5 ? `Only ${product.stock} left` : `${product.stock} in stock`}
                </p>

                <div className="mt-auto flex gap-2 pt-2">
                    <button onClick={addToCart} disabled={!inStock} className="btn-primary flex-1">
                        <ShoppingCart className="size-4" aria-hidden="true" /> Add to cart
                    </button>
                    <button
                        onClick={() => toggleCompare(product)}
                        aria-pressed={comparing}
                        aria-label={comparing ? "Remove from compare" : "Add to compare"}
                        title={comparing ? "Remove from compare" : "Add to compare"}
                        className={`btn-ghost px-3 ${comparing ? "border-brand-600 text-brand-700 dark:border-brand-400 dark:text-brand-300" : ""}`}
                    >
                        <Scale className="size-4" />
                    </button>
                </div>
            </div>
        </article>
    );
}

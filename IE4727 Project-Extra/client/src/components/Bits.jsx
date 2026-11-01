// Small pieces used on many pages.

import { Star } from "lucide-react";
import { money, percentOff } from "../api.js";

// 1-5 stars; screen readers hear "4 out of 5 stars"
export function Stars({ rating, size = "size-4" }) {
    return (
        <span className="inline-flex text-amber-500 dark:text-amber-400" role="img" aria-label={`${rating} out of 5 stars`}>
            {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} className={`${size} ${n <= rating ? "fill-current" : ""}`} aria-hidden="true" />
            ))}
        </span>
    );
}

export function Price({ product, large = false }) {
    return (
        <span className="inline-flex flex-wrap items-baseline gap-x-2">
            <span className={`font-bold tabular-nums ${large ? "text-3xl" : "text-lg"}`}>{money(product.price)}</span>
            {percentOff(product) > 0 && (
                <s className="text-sm text-slate-500 tabular-nums dark:text-slate-400">{money(product.oldPrice)}</s>
            )}
        </span>
    );
}

export function SaleBadge({ product, className = "" }) {
    const off = percentOff(product);
    if (!off) return null;
    return <span className={`rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white ${className}`}>-{off}%</span>;
}

// Grey placeholder shapes while data loads
export function Skeleton({ className = "" }) {
    return <div className={`animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800 ${className}`} aria-hidden="true" />;
}

export function ProductImage({ product, className = "" }) {
    return product.image
        ? <img src={product.image} alt={product.name} loading="lazy" className={`h-full w-full object-contain p-3 ${className}`} />
        : <span className="text-sm text-slate-400">No photo</span>;
}

export function PageTitle({ icon: Icon, title, children }) {
    return (
        <div className="mb-6">
            <h1 className="flex items-center gap-3 text-2xl font-bold sm:text-3xl">
                {Icon && <Icon className="size-7 text-brand-700 dark:text-brand-400" aria-hidden="true" />}
                {title}
            </h1>
            {children && <p className="muted mt-1">{children}</p>}
        </div>
    );
}

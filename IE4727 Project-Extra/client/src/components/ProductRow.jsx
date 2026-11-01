// A titled row of product cards that scrolls sideways (Amazon style), with arrow buttons.

import { useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import ProductCard from "./ProductCard.jsx";

export default function ProductRow({ title, icon: Icon, products, linkTo, linkText = "See all" }) {
    const track = useRef(null);
    if (!products.length) return null;

    const scroll = (direction) => track.current.scrollBy({ left: direction * track.current.clientWidth * 0.85, behavior: "smooth" });

    return (
        <section className="mb-12" aria-label={title}>
            <div className="mb-4 flex items-end justify-between gap-4">
                <h2 className="flex items-center gap-2 text-xl font-bold">
                    {Icon && <Icon className="size-5 text-brand-700 dark:text-brand-400" aria-hidden="true" />}
                    {title}
                </h2>
                <div className="flex items-center gap-2">
                    {linkTo && <Link to={linkTo} className="link inline-flex items-center gap-1 text-sm">{linkText} <ArrowRight className="size-4" /></Link>}
                    <button onClick={() => scroll(-1)} className="btn-ghost hidden p-2 sm:inline-flex" aria-label={`Scroll ${title} left`}><ChevronLeft className="size-4" /></button>
                    <button onClick={() => scroll(1)} className="btn-ghost hidden p-2 sm:inline-flex" aria-label={`Scroll ${title} right`}><ChevronRight className="size-4" /></button>
                </div>
            </div>
            <div ref={track} className="no-scrollbar -mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-2">
                {products.map((p) => (
                    // flex: every card stretches to the tallest one, so the buttons line up
                    <div key={p.id} className="flex w-64 shrink-0 snap-start [&>article]:w-full">
                        <ProductCard product={p} />
                    </div>
                ))}
            </div>
        </section>
    );
}

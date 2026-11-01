// PC Builder: choose a part per slot and every check updates instantly as you pick (no reload).
// The same rules as the PHP version: socket, memory type, power supply headroom, cooler.

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Box, Check, CircleCheck, CircleX, Cpu, Fan, HardDrive, MemoryStick, Monitor, Plug, RotateCcw, Server, ShoppingCart, TriangleAlert } from "lucide-react";
import { useCatalog } from "../context/CatalogContext.jsx";
import { useCart } from "../context/CartContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { money } from "../api.js";
import { PageTitle, ProductImage } from "../components/Bits.jsx";

const SLOTS = [
    ["cpu", "Processor (CPU)", Cpu, true],
    ["motherboard", "Motherboard", Server, true],
    ["memory", "Memory (RAM)", MemoryStick, true],
    ["gpu", "Graphics card", Monitor, false],
    ["storage", "Storage", HardDrive, true],
    ["psu", "Power supply", Plug, true],
    ["cooler", "CPU cooler", Fan, false],
    ["case", "Case", Box, true]
];
const OTHER_PARTS_WATTS = 100;
const HEADROOM = 1.3;

const PRESETS = {
    "AM5 gaming PC": ["AMD Ryzen 7 9800X3D Processor", "ASUS TUF Gaming B650-PLUS Motherboard", "Crucial Pro 64GB (2x32GB) DDR5-6400 Kit", "AMD Radeon RX 9070 XT", "WD Blue 1TB SATA SSD", "Corsair RM850x Shift 850W Power Supply", "ARCTIC Liquid Freezer III Pro 360 CPU Cooler", "NZXT H5 Flow Mid-Tower Case"],
    "Creator workstation": ["AMD Ryzen 9 9950X3D Processor", "ASUS TUF Gaming B650-PLUS Motherboard", "Crucial Pro 64GB (2x32GB) DDR5-6400 Kit", "NVIDIA GeForce RTX 5080 Founders Edition", "WD Blue 1TB SATA SSD", "Corsair RM850x Shift 850W Power Supply", "ARCTIC Liquid Freezer III Pro 360 CPU Cooler", "NZXT H5 Flow Mid-Tower Case"]
};

// Every rule as [level, message]: ok, warning or error
function checkBuild(build) {
    const { cpu, motherboard: board, memory, gpu, psu, cooler } = build;
    const checks = [];
    if (cpu && board) checks.push(cpu.socket === board.socket
        ? ["ok", `Processor and motherboard both use the ${cpu.socket} socket.`]
        : ["error", `The ${cpu.name} needs an ${cpu.socket} motherboard, but the ${board.name} is ${board.socket}.`]);
    if (board && memory) checks.push(board.memoryType === memory.memoryType
        ? ["ok", `The motherboard takes ${board.memoryType} memory, which matches your RAM.`]
        : ["error", `The ${board.name} takes ${board.memoryType} memory, but the ${memory.name} is ${memory.memoryType}.`]);

    const watts = (cpu?.wattage || 0) + (gpu?.wattage || 0) + OTHER_PARTS_WATTS;
    const recommended = Math.ceil((watts * HEADROOM) / 50) * 50;
    if (psu) {
        if (psu.wattage < watts) checks.push(["error", `The ${psu.wattage}W power supply is too small: this build needs about ${watts}W.`]);
        else if (psu.wattage < recommended) checks.push(["warning", `The ${psu.wattage}W supply works, but ${recommended}W or more leaves safer headroom.`]);
        else checks.push(["ok", `The ${psu.wattage}W power supply covers the estimated ${watts}W with room to spare.`]);
    }
    if (cpu && !cooler) checks.push(["warning", `The ${cpu.name} doesn't include a cooler. Add a CPU cooler.`]);
    if (cpu && !gpu) checks.push(["warning", "No graphics card: the processor's built-in graphics are fine for desktop work, not gaming."]);
    Object.values(build).forEach((p) => p && p.stock === 0 && checks.push(["error", `${p.name} is out of stock right now.`]));
    return { checks, watts, recommended };
}

export default function Builder() {
    const { products } = useCatalog();
    const { add, setOpen } = useCart();
    const toast = useToast();
    const [picked, setPicked] = useState({});   // slot -> product id

    const parts = useMemo(() => {
        const bySlot = Object.fromEntries(SLOTS.map(([slot]) => [slot, []]));
        products.filter((p) => p.partType).sort((a, b) => a.price - b.price).forEach((p) => bySlot[p.partType]?.push(p));
        return bySlot;
    }, [products]);

    const build = Object.fromEntries(SLOTS.map(([slot]) => [slot, parts[slot].find((p) => p.id === picked[slot]) || null]));
    const chosen = Object.values(build).filter(Boolean);
    const { checks, watts, recommended } = checkBuild(build);
    const errors = checks.filter(([level]) => level === "error").length;
    const missing = SLOTS.filter(([slot, , , required]) => required && !build[slot]).map(([, label]) => label);
    const total = chosen.reduce((s, p) => s + p.price, 0);
    const saving = chosen.reduce((s, p) => s + (p.oldPrice > p.price ? p.oldPrice - p.price : 0), 0);

    // Why a part won't fit what's already chosen, shown in its option
    const note = (slot, p) => {
        if (slot === "motherboard" && build.cpu && p.socket !== build.cpu.socket) return " - doesn't fit this CPU";
        if (slot === "cpu" && build.motherboard && p.socket !== build.motherboard.socket) return " - doesn't fit this motherboard";
        if (slot === "memory" && build.motherboard && p.memoryType !== build.motherboard.memoryType) return " - doesn't fit this motherboard";
        return p.stock === 0 ? " - out of stock" : "";
    };

    const applyPreset = (names) => {
        const next = {};
        SLOTS.forEach(([slot]) => { const p = parts[slot].find((x) => names.includes(x.name)); if (p) next[slot] = p.id; });
        setPicked(next);
    };

    const addBuild = () => {
        chosen.forEach((p) => add(p));
        toast(`Your build is in the cart: ${chosen.length} parts added.`);
        setOpen(true);
    };

    const [statusLevel, StatusIcon, statusText] = !chosen.length ? ["info", Cpu, "Start by choosing a processor"]
        : errors ? ["error", CircleX, `${errors} problem${errors > 1 ? "s" : ""} to fix`]
        : missing.length ? ["warning", TriangleAlert, `Compatible so far: ${missing.length} part${missing.length > 1 ? "s" : ""} still needed`]
        : ["ok", CircleCheck, "Every part is compatible"];
    const statusColour = { info: "bg-brand-600/10 text-brand-800 dark:text-brand-300", error: "bg-red-600/10 text-red-700 dark:text-red-300", warning: "bg-orange-500/10 text-orange-800 dark:text-orange-300", ok: "bg-green-600/10 text-green-800 dark:text-green-300" }[statusLevel];
    const checkIcon = { ok: [Check, "text-green-600 dark:text-green-400"], warning: [TriangleAlert, "text-orange-600 dark:text-orange-400"], error: [CircleX, "text-red-600 dark:text-red-400"] };

    return (
        <>
            <PageTitle icon={Cpu} title="PC Builder">Pick a part for each slot. Compatibility, power and price update the moment you choose.</PageTitle>

            <div className="mb-6 flex flex-wrap items-center gap-3">
                <span className="text-sm font-semibold">Ready-made builds:</span>
                {Object.entries(PRESETS).map(([name, names]) => <button key={name} onClick={() => applyPreset(names)} className="btn-ghost">{name}</button>)}
                <button onClick={() => setPicked({})} className="link inline-flex items-center gap-1 text-sm"><RotateCcw className="size-3.5" /> Start over</button>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
                <div className="space-y-3">
                    {SLOTS.map(([slot, label, Icon, required]) => {
                        const p = build[slot];
                        return (
                            <div key={slot} className={`card flex items-center gap-4 p-4 ${p ? "border-brand-500 dark:border-brand-400" : ""}`}>
                                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700 dark:bg-slate-800 dark:text-brand-300"><Icon className="size-5" aria-hidden="true" /></span>
                                <label className="flex-1">
                                    <span className="mb-1 block text-sm font-bold">{label} {!required && <span className="muted font-normal">(optional)</span>}</span>
                                    <select value={picked[slot] || ""} onChange={(e) => setPicked({ ...picked, [slot]: Number(e.target.value) || undefined })} className="input">
                                        <option value="">Choose...</option>
                                        {parts[slot].map((x) => (
                                            <option key={x.id} value={x.id}>
                                                {x.name} - {money(x.price)}{[x.socket, x.memoryType, x.wattage && `${x.wattage}W`].filter(Boolean).length ? ` (${[x.socket, x.memoryType, x.wattage && `${x.wattage}W`].filter(Boolean).join(", ")})` : ""}{note(slot, x)}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                {p && <Link to={`/product/${p.id}`} className="photo-box hidden size-14 shrink-0 sm:flex" title={`View ${p.name}`}><ProductImage product={p} className="p-1" /></Link>}
                            </div>
                        );
                    })}
                </div>

                <aside className="card h-fit space-y-4 p-5 lg:sticky lg:top-24" aria-live="polite">
                    <p className={`flex items-center gap-2 rounded-xl p-3 font-bold ${statusColour}`}><StatusIcon className="size-5" /> {statusText}</p>
                    {checks.length > 0 && (
                        <ul className="space-y-2 text-sm">
                            {checks.map(([level, message]) => {
                                const [Icon, colour] = checkIcon[level];
                                return <li key={message} className="flex gap-2"><Icon className={`mt-0.5 size-4 shrink-0 ${colour}`} aria-hidden="true" /><span>{message}</span></li>;
                            })}
                        </ul>
                    )}
                    {chosen.length > 0 && missing.length > 0 && <p className="muted text-sm"><strong>Still needed:</strong> {missing.join(", ")}</p>}

                    {/* Power gauge: estimated draw against the chosen supply (or the recommended size) */}
                    {chosen.length > 0 && (
                        <div>
                            <p className="mb-1 flex justify-between text-sm"><span className="font-semibold">Estimated power</span><span>{watts}W / {build.psu ? `${build.psu.wattage}W` : `${recommended}W recommended`}</span></p>
                            <div className="h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800" role="img" aria-label={`Uses ${watts} of ${build.psu?.wattage || recommended} watts`}>
                                <div className={`h-full rounded-full ${build.psu && watts > build.psu.wattage ? "bg-red-600" : "bg-green-600"}`} style={{ width: `${Math.min(100, (watts / (build.psu?.wattage || recommended)) * 100)}%` }} />
                            </div>
                        </div>
                    )}

                    <dl className="grid grid-cols-2 gap-y-1 border-t border-slate-200 pt-4 text-sm dark:border-slate-800">
                        <dt>Parts</dt><dd className="text-right">{chosen.length} of {SLOTS.length}</dd>
                        {saving > 0 && <><dt className="text-green-700 dark:text-green-400">Deals included</dt><dd className="text-right text-green-700 dark:text-green-400">-{money(saving)}</dd></>}
                        <dt className="text-lg font-bold">Total</dt><dd className="text-right text-2xl font-bold">{money(total)}</dd>
                    </dl>
                    <button onClick={addBuild} disabled={!chosen.length || errors > 0} className="btn-primary w-full py-3">
                        <ShoppingCart className="size-4" /> Add build to cart
                    </button>
                    {errors > 0 && <p className="muted text-center text-xs">Fix the problems above to add this build.</p>}
                </aside>
            </div>
        </>
    );
}

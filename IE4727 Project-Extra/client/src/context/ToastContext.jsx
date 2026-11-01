// Toast messages: small notes in the corner that disappear by themselves ("Added to cart").
// Any component can call  const toast = useToast();  toast("Saved")  or  toast("Oops", "error")

import { createContext, useCallback, useContext, useState } from "react";
import { CircleCheck, CircleX, Info, X } from "lucide-react";

const ToastContext = createContext(() => {});
export const useToast = () => useContext(ToastContext);

const ICONS = { success: CircleCheck, error: CircleX, info: Info };
const COLOURS = {
    success: "border-green-600/30 text-green-800 dark:text-green-300",
    error: "border-red-600/30 text-red-700 dark:text-red-300",
    info: "border-brand-600/30 text-brand-800 dark:text-brand-300"
};

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const dismiss = (id) => setToasts((list) => list.filter((t) => t.id !== id));

    const toast = useCallback((message, type = "success") => {
        const id = crypto.randomUUID();
        setToasts((list) => [...list.slice(-3), { id, message, type }]);   // at most 4 on screen
        setTimeout(() => dismiss(id), 3500);
    }, []);

    return (
        <ToastContext.Provider value={toast}>
            {children}
            {/* role="status" makes screen readers announce each new message */}
            <div className="fixed right-4 bottom-4 z-[60] print:hidden flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2" role="status" aria-live="polite">
                {toasts.map(({ id, message, type }) => {
                    const Icon = ICONS[type];
                    return (
                        <div key={id} className={`card flex items-start gap-3 p-3 text-sm font-medium shadow-lg ${COLOURS[type]}`}>
                            <Icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                            <p className="flex-1">{message}</p>
                            <button onClick={() => dismiss(id)} aria-label="Dismiss" className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                                <X className="size-4" />
                            </button>
                        </div>
                    );
                })}
            </div>
        </ToastContext.Provider>
    );
}

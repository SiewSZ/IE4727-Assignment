// Small fetch wrapper for the Express API. Sends and receives JSON, includes the session cookie,
// and throws an Error with the server's message when a request fails.

export async function api(path, { method = "GET", body } = {}) {
    const res = await fetch(`/api${path}`, {
        method,
        credentials: "same-origin",
        headers: body === undefined ? {} : { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body)
    });

    let data = null;
    try {
        data = await res.json();
    } catch {
        // No JSON at all usually means the API server isn't running
    }
    if (!res.ok) {
        const error = new Error(data?.error || "Can't reach the server. Is the API running (npm run dev)?");
        error.status = res.status;
        throw error;
    }
    return data;
}

// Money as "$1,234.50"
const formatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
export const money = (n) => formatter.format(Number(n) || 0);

// % off the regular price, or 0 when not on sale
export const percentOff = (p) => (p.oldPrice && p.oldPrice > p.price ? Math.round((1 - p.price / p.oldPrice) * 100) : 0);

// "2026-11-01 14:05:00" (MySQL) -> "01 Nov 2026"
export const niceDate = (value) =>
    new Date(String(value).replace(" ", "T")).toLocaleDateString("en-SG", { day: "2-digit", month: "short", year: "numeric" });

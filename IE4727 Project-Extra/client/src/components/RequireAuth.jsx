// Route guard: sends signed-out visitors to the sign-in page (and back here afterwards).
// With admin, also turns away signed-in customers.

import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { Skeleton } from "./Bits.jsx";

export default function RequireAuth({ admin = false, children }) {
    const { user, ready, isAdmin } = useAuth();
    const location = useLocation();

    if (!ready) return <Skeleton className="h-64" />;
    if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
    if (admin && !isAdmin) {
        return (
            <div className="card p-10 text-center">
                <h1 className="text-xl font-bold">Admins only</h1>
                <p className="muted mt-2">Sign in with an admin account to open the dashboard.</p>
            </div>
        );
    }
    return children;
}

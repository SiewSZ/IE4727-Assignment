// Who is signed in. Loaded once from /api/auth/me; login, register and logout update it.

import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../api.js";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [ready, setReady] = useState(false);   // false until we know whether someone is signed in

    useEffect(() => {
        api("/auth/me")
            .then((data) => setUser(data.user))
            .catch(() => setUser(null))
            .finally(() => setReady(true));
    }, []);

    const login = async (login, password) => setUser((await api("/auth/login", { method: "POST", body: { login, password } })).user);
    const register = async (fields) => setUser((await api("/auth/register", { method: "POST", body: fields })).user);
    const logout = async () => {
        await api("/auth/logout", { method: "POST", body: {} });
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, ready, isAdmin: user?.role === "admin", login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

// Sign in and Create account, in two tabs. Checks each field as you type, and the server checks again.

import { useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, User } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";

const RULES = {
    username: (v) => (/^[A-Za-z0-9_]{3,50}$/.test(v) ? "" : "3-50 letters, numbers or underscores."),
    email: (v) => (/^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(v) ? "" : "Enter a valid email, e.g. name@example.com."),
    password: (v) => (v.length >= 8 ? "" : "At least 8 characters.")
};

function Field({ label, error, children }) {
    return (
        <label className="block">
            <span className="mb-1 block text-sm font-semibold">{label}</span>
            {children}
            {error && <span className="mt-1 block text-xs text-red-700 dark:text-red-400">{error}</span>}
        </label>
    );
}

export default function Login() {
    const { user, login, register } = useAuth();
    const toast = useToast();
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const next = params.get("next")?.startsWith("/") ? params.get("next") : "/";

    const [mode, setMode] = useState("signin");
    const [fields, setFields] = useState({ login: "", username: "", email: "", password: "" });
    const [touched, setTouched] = useState({});
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    if (user) return <Navigate to={next} replace />;

    const set = (key) => (e) => setFields({ ...fields, [key]: e.target.value });
    const touch = (key) => () => setTouched({ ...touched, [key]: true });
    const fieldError = (key) => (mode === "register" && touched[key] ? RULES[key](fields[key].trim()) : "");

    const submit = async (e) => {
        e.preventDefault();
        setError("");
        if (mode === "register") {
            setTouched({ username: true, email: true, password: true });
            if (["username", "email", "password"].some((k) => RULES[k](fields[k].trim()))) return;
        } else if (!fields.login.trim() || !fields.password) {
            return setError("Please enter your username/email and password.");
        }
        setBusy(true);
        try {
            if (mode === "register") {
                await register({ username: fields.username.trim(), email: fields.email.trim(), password: fields.password });
                toast("Welcome to Quantum Gear! Your account is ready.");
            } else {
                await login(fields.login.trim(), fields.password);
                toast("Signed in.");
            }
            navigate(next, { replace: true });
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    };

    const tab = (value, label) => (
        <button type="button" role="tab" aria-selected={mode === value} onClick={() => { setMode(value); setError(""); }}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold ${mode === value ? "bg-white shadow dark:bg-slate-800" : "muted"}`}>{label}</button>
    );

    return (
        <div className="mx-auto max-w-md">
            <div className="card p-8">
                <h1 className="mb-6 flex items-center gap-2 text-2xl font-bold"><User className="size-6 text-brand-700 dark:text-brand-400" /> {mode === "signin" ? "Welcome back" : "Create your account"}</h1>
                <div className="mb-6 flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-950" role="tablist">
                    {tab("signin", "Sign in")}
                    {tab("register", "Create account")}
                </div>

                <form onSubmit={submit} className="space-y-4" noValidate>
                    {mode === "signin" ? (
                        <Field label="Username or email">
                            <input className="input" value={fields.login} onChange={set("login")} autoComplete="username" />
                        </Field>
                    ) : (
                        <>
                            <Field label="Username" error={fieldError("username")}>
                                <input className="input" value={fields.username} onChange={set("username")} onBlur={touch("username")} autoComplete="username" maxLength={50} />
                            </Field>
                            <Field label="Email" error={fieldError("email")}>
                                <input className="input" type="email" value={fields.email} onChange={set("email")} onBlur={touch("email")} autoComplete="email" maxLength={100} />
                            </Field>
                        </>
                    )}
                    <Field label="Password" error={fieldError("password")}>
                        <span className="relative block">
                            <input className="input pr-10" type={showPassword ? "text" : "password"} value={fields.password} onChange={set("password")} onBlur={touch("password")}
                                autoComplete={mode === "signin" ? "current-password" : "new-password"} />
                            <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-500" aria-label={showPassword ? "Hide password" : "Show password"}>
                                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                            </button>
                        </span>
                    </Field>
                    {mode === "register" && fields.password && (
                        <div className="flex gap-1" aria-hidden="true">
                            {[8, 12, 16].map((n) => <span key={n} className={`h-1.5 flex-1 rounded-full ${fields.password.length >= n ? "bg-green-600" : "bg-slate-200 dark:bg-slate-800"}`} />)}
                        </div>
                    )}
                    {error && <p className="rounded-lg bg-red-600/10 p-3 text-sm text-red-700 dark:text-red-300" role="alert">{error}</p>}
                    <button disabled={busy} className="btn-primary w-full py-3">{busy ? "Please wait..." : mode === "signin" ? "Sign in" : "Create account"}</button>
                </form>
            </div>
            <p className="muted mt-4 text-center text-xs">The same accounts work on the PHP version of Quantum Gear.</p>
        </div>
    );
}

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// During development the React app runs on :5173 and forwards API calls to Express on :4000,
// so both share one origin and the session cookie just works.
export default defineConfig({
    plugins: [react(), tailwindcss()],
    server: {
        port: 5173,
        proxy: { "/api": "http://localhost:4000" }
    }
});

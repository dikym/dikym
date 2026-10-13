import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
    plugins: [
        react(),
        tailwindcss(),
        {
            name: "arcade-module-url",
            resolveId(id) {
                if (id === "virtual:arcade-url") return "\0" + id;
            },
            load(id) {
                if (id !== "\0virtual:arcade-url") return;
                // Retry needs the built chunk URL to bypass the browser's failed import cache.
                return command === "serve"
                    ? 'export default "/src/components/arcade/Quorzak.tsx";'
                    : `export default import.meta.ROLLUP_FILE_URL_${this.emitFile(
                          {
                              type: "chunk",
                              id: new URL(
                                  "./src/components/arcade/Quorzak.tsx",
                                  import.meta.url
                              ).pathname,
                              preserveSignature: "strict",
                          }
                      )};`;
            },
        },
    ],
    build: {
        rollupOptions: {
            input: {
                main: new URL("./index.html", import.meta.url).pathname,
                quorzak: new URL("./quorzak/index.html", import.meta.url)
                    .pathname,
            },
        },
    },
}));

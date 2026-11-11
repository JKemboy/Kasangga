import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // PDF.js is loaded on demand by OCR. Serve its ESM files directly so
  // opening an upload does not invalidate Vite's optimized dependency URLs.
  optimizeDeps: {
    exclude: ["pdfjs-dist"],
  },
  server: {
    watch: {
      ignored: ["**/.empty-check/**"],
    },
  },
});

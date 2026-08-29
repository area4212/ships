import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // chemins relatifs -> fonctionne a la racine d'un domaine ET sous /repo/ (GitHub Pages)
  base: "./",
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
  },
});

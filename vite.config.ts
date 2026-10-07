// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'
// import tailwindcss from '@tailwindcss/vite'

// export default defineConfig({
//   plugins: [react(), tailwindcss()],
// })


import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist',
  },
  server: {
    port: 5173,
    strictPort: false,
    host: true,
    proxy: {
      // All API calls and socket.io traffic are proxied server-side to the
      // backend. This means any device on the same WiFi that opens the
      // frontend at http://<machine-ip>:5173 will have its API and socket
      // requests forwarded by Vite — no browser-level CORS headers required.
      "/api": {
        // target: "http://192.168.29.106:5000",
        // target: "https://cx5k3gqd-5000.inc1.devtunnels.ms",
        target: "http://localhost:5000",


        changeOrigin: true,
      },
      "/socket.io": {
        // target: "http://192.168.29.106:5000",
        // target: "https://cx5k3gqd-5000.inc1.devtunnels.ms",
        target: "http://localhost:5000",

        changeOrigin: true,
        ws: true,
      },
      "/uploads": {
        // target: "http://192.168.29.106:5000",
        // target: "https://cx5k3gqd-5000.inc1.devtunnels.ms",
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
});


import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";

const DFINITY_PKGS = [
  "@dfinity/agent",
  "@dfinity/candid",
  "@dfinity/principal",
  "@dfinity/sns",
  "@dfinity/ledger-icrc",
  "@dfinity/utils",
];

export default defineConfig(({ mode }) => {
  const isDev = mode === "development";
  // const isTest = mode === "test";
  // const isProd = mode === "production";
  return {
    build: {
      minify: !isDev,
      sourcemap: false,
    },
    esbuild: {
      legalComments: "none",
      drop: isDev ? [] : ["debugger"],
    },
    plugins: [
      react(),
      nodePolyfills({
        globals: { Buffer: true, global: true, process: true },
      }),
    ],
    resolve: {
      // Force all @dfinity packages to resolve from the app's node_modules,
      // even when imported transitively from the library (sns-assets).
      dedupe: DFINITY_PKGS,
      alias: {
        "buffer/": path.resolve("node_modules/vite-plugin-node-polyfills/shims/buffer/"),
        "vite-plugin-node-polyfills/shims/global": path.resolve(
          "node_modules/vite-plugin-node-polyfills/shims/global"
        ),
        "vite-plugin-node-polyfills/shims/process": path.resolve(
          "node_modules/vite-plugin-node-polyfills/shims/process"
        ),
      },
    },
  };
});

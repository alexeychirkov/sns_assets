import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import { resolve } from "path";

const DFINITY_EXTERNALS = [
  "@dfinity/agent",
  "@dfinity/candid",
  "@dfinity/principal",
  "@dfinity/sns",
  "@dfinity/ledger-icrc",
  "@dfinity/utils",
];

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      formats: ["es", "cjs"],
      fileName: (format) => `index.${format === "es" ? "js" : "cjs"}`,
    },
    rollupOptions: {
      external: DFINITY_EXTERNALS,
    },
    sourcemap: true,
  },
  plugins: [
    dts({
      tsconfigPath: resolve(__dirname, "tsconfig.json"),
      include: ["src/**/*"],
      outDir: "dist",
      rollupTypes: true,
    }),
  ],
});

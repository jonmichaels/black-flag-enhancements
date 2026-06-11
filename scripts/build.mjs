import { build } from "esbuild";

await build({
  entryPoints: ["src/module.js"],
  outfile: "dist/module.js",
  bundle: true,
  format: "esm",
  platform: "browser",
  target: ["es2022"],
  minify: false,
  sourcemap: false,
  banner: { js: "// ─── Black Flag Enhancements ───" }
});

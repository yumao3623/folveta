import { build } from "esbuild";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

// Static SVG exports are generated from the same artwork used by the animated
// React components. No duplicated hand-maintained paths or embedded bitmaps.
const root = process.cwd();
await mkdir(resolve(root, "public/icons"), { recursive: true });
const buildDirectory = await mkdtemp(resolve(tmpdir(), "folveta-vector-export-"));
const compiled = resolve(buildDirectory, "cartoon-icons.cjs");
await build({
  entryPoints: [resolve(root, "components/ui/cartoon-icon.tsx")],
  outfile: compiled,
  bundle: true,
  platform: "node",
  format: "cjs",
  jsx: "automatic",
  loader: { ".css": "empty" },
  alias: { "@": root },
});
const require = createRequire(import.meta.url);
const { CartoonIcon } = require(compiled);
const names = ["home", "upload", "guide", "library", "search", "profile", "history", "material", "source", "check", "success", "error", "locked", "loading", "target", "help", "lightbulb", "edit", "trash", "archive"];
for (const name of names) {
  const svg = renderToStaticMarkup(React.createElement(CartoonIcon, { name, size: 64, title: `Folveta ${name}` }))
    .replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" ');
  await writeFile(resolve(root, `public/icons/${name}.svg`), `${svg}\n`);
}
console.log(`Exported ${names.length} standalone vector icons from CartoonIcon.`);

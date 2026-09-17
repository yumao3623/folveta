import { build } from "esbuild";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

// Keep downloadable/static icon files aligned with the same semantic Lucide
// mapping used by the product UI. Filenames stay stable for any external links.
const root = process.cwd();
const names = [
  "home",
  "upload",
  "guide",
  "library",
  "search",
  "profile",
  "history",
  "material",
  "source",
  "check",
  "success",
  "error",
  "locked",
  "loading",
  "target",
  "help",
  "lightbulb",
  "edit",
  "trash",
  "archive",
];

await mkdir(resolve(root, "public/icons"), { recursive: true });
const buildDirectory = await mkdtemp(resolve(root, ".study-icon-export-"));
const compiled = resolve(buildDirectory, "study-icons.cjs");

await build({
  entryPoints: [resolve(root, "components/ui/study-icon.tsx")],
  outfile: compiled,
  bundle: true,
  platform: "node",
  format: "cjs",
  jsx: "automatic",
  loader: { ".css": "empty" },
  alias: { "@": root },
  external: ["react", "react-dom", "lucide-react"],
});

const require = createRequire(import.meta.url);
const { StudyIcon } = require(compiled);

for (const name of names) {
  const svg = renderToStaticMarkup(
    React.createElement(StudyIcon, {
      name,
      size: 24,
      color: "#20332b",
      title: `Folveta ${name}`,
    }),
  ).replace(/ class="[^"]*"/, "");

  await writeFile(resolve(root, `public/icons/${name}.svg`), `${svg}\n`);
}

await rm(buildDirectory, { recursive: true, force: true });
console.log(`Exported ${names.length} standalone vector icons from StudyIcon.`);

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";

const root = process.cwd();
const source = resolve(root, "app/icon.svg");
const pngPath = resolve(root, "app/icon.png");
const icoPath = resolve(root, "app/favicon.ico");
const svg = await readFile(source);

const png512 = await sharp(svg, { density: 512 })
  .resize(512, 512, { fit: "contain" })
  .png()
  .toBuffer();
const png64 = await sharp(svg, { density: 256 })
  .resize(64, 64, { fit: "contain" })
  .png()
  .toBuffer();

// ICO supports PNG-compressed entries. One crisp 64px entry is enough for the
// browser favicon while the App Router uses icon.png for larger surfaces.
const header = Buffer.alloc(22);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(1, 4);
header.writeUInt8(64, 6);
header.writeUInt8(64, 7);
header.writeUInt8(0, 8);
header.writeUInt8(0, 9);
header.writeUInt16LE(1, 10);
header.writeUInt16LE(32, 12);
header.writeUInt32LE(png64.length, 14);
header.writeUInt32LE(22, 18);

await writeFile(pngPath, png512);
await writeFile(icoPath, Buffer.concat([header, png64]));

console.log("Built app/icon.png and app/favicon.ico from app/icon.svg.");

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const sourceRoot = resolve(root, "scripts/assets/vendor/ira/outline");
const outputRoot = resolve(root, "public/illustrations");

const palette = {
  ink: "#20332b",
  green: "#0a9e4a",
  greenDark: "#08783a",
  mint: "#bcefd0",
  blue: "#3ab8f2",
  blueSoft: "#bfeafa",
  coral: "#ff6b6b",
  coralSoft: "#ffc5bf",
  yellow: "#ffcf3e",
  paper: "#fffdf8",
  paperWarm: "#f8f3e9",
};

const files = {
  character6: "characters/character-6.svg",
  character11: "characters/character-11.svg",
  character14: "characters/character-14.svg",
  character15: "characters/character-15.svg",
  character16: "characters/character-16.svg",
};

const sourceCache = new Map();

async function source(name) {
  if (!sourceCache.has(name)) {
    const file = await readFile(resolve(sourceRoot, files[name]), "utf8");
    const inner = file
      .replace(/<\?xml[^>]*>\s*/i, "")
      .replace(/<svg[^>]*>/i, "")
      .replace(/<\/svg>\s*$/i, "")
      .replace(/<title>[\s\S]*?<\/title>/gi, "")
      .replace(/#151515/gi, palette.ink)
      .replace(/#000000/gi, palette.ink)
      .replace(/#FFFFFF/gi, palette.paper)
      .replace(/#EDEDED/gi, palette.blueSoft)
      .replace(/#F2F2F2/gi, palette.paperWarm)
      .replace(/#F4F4F4/gi, palette.paperWarm)
      .replace(/#4B46BD/gi, palette.blue)
      .replace(/#5ACCEC/gi, palette.mint);
    sourceCache.set(name, inner.trim());
  }
  return sourceCache.get(name);
}

function group(inner, transform) {
  return `<g transform="${transform}">${inner}</g>`;
}

function card(x, y, width, height, fill, rotation = 0) {
  return `<g transform="translate(${x} ${y}) rotate(${rotation} ${width / 2} ${height / 2})">
  <rect width="${width}" height="${height}" rx="10" fill="${palette.paper}" stroke="${palette.ink}" stroke-width="4"/>
  <rect x="10" y="10" width="${Math.min(24, width - 20)}" height="${Math.min(24, height - 20)}" rx="6" fill="${fill}"/>
  <path d="M${Math.min(48, width - 20)} 18h${Math.max(8, width - 66)}M${Math.min(48, width - 20)} 32h${Math.max(8, width - 78)}" stroke="${palette.ink}" stroke-width="4" stroke-linecap="round" opacity=".65"/>
  </g>`;
}

function marker(x, y, fill = palette.coral) {
  return `<g transform="translate(${x} ${y})"><circle cx="0" cy="0" r="22" fill="${fill}" stroke="${palette.ink}" stroke-width="4"/><path d="m-9 0 7 7L10-8" fill="none" stroke="${palette.paper}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></g>`;
}

function desk(x, y, width = 290, fill = palette.paper) {
  const height = 18;
  return `<g transform="translate(${x} ${y})">
    <rect width="${width}" height="${height}" rx="9" fill="${fill}" stroke="${palette.ink}" stroke-width="5"/>
    <path d="M28 ${height} 12 130M${width - 28} ${height} ${width - 12} 130" fill="none" stroke="${palette.ink}" stroke-width="5" stroke-linecap="round"/>
    <path d="M48 42h${Math.max(80, width - 96)}" stroke="${palette.blue}" stroke-width="5" stroke-linecap="round" opacity=".6"/>
  </g>`;
}

function bookStack(x, y, scale = 1) {
  return `<g transform="translate(${x} ${y}) scale(${scale})">
    <rect x="0" y="72" width="150" height="32" rx="9" fill="${palette.blue}" stroke="${palette.ink}" stroke-width="5" transform="rotate(-4 75 88)"/>
    <rect x="14" y="42" width="150" height="32" rx="9" fill="${palette.coral}" stroke="${palette.ink}" stroke-width="5" transform="rotate(4 89 58)"/>
    <rect x="4" y="10" width="150" height="32" rx="9" fill="${palette.yellow}" stroke="${palette.ink}" stroke-width="5"/>
    <path d="M28 26h87M35 58h88M24 88h92" stroke="${palette.paper}" stroke-width="5" stroke-linecap="round" opacity=".85"/>
  </g>`;
}

function laptop(x, y, scale = 1, screen = palette.blueSoft) {
  return `<g transform="translate(${x} ${y}) scale(${scale})">
    <rect x="12" y="0" width="190" height="116" rx="10" fill="${screen}" stroke="${palette.ink}" stroke-width="5"/>
    <rect x="28" y="17" width="158" height="70" rx="6" fill="${palette.paper}" stroke="${palette.ink}" stroke-width="4"/>
    <path d="M0 124h214l-20 24H20Z" fill="${palette.mint}" stroke="${palette.ink}" stroke-width="5" stroke-linejoin="round"/>
    <circle cx="107" cy="104" r="5" fill="${palette.coral}"/>
  </g>`;
}

function calendar(x, y, scale = 1) {
  return `<g transform="translate(${x} ${y}) scale(${scale})">
    <rect width="180" height="152" rx="14" fill="${palette.paper}" stroke="${palette.ink}" stroke-width="5"/>
    <path d="M0 44h180" stroke="${palette.ink}" stroke-width="5"/>
    <path d="M34 14v26M146 14v26" stroke="${palette.coral}" stroke-width="8" stroke-linecap="round"/>
    <path d="M32 72h18m22 0h18m22 0h18M32 101h18m22 0h18m22 0h18M32 130h18m22 0h18m22 0h18" stroke="${palette.blue}" stroke-width="8" stroke-linecap="round"/>
    <circle cx="128" cy="72" r="9" fill="${palette.green}"/>
  </g>`;
}

function sourcePage(x, y, scale = 1, accent = palette.blue) {
  return `<g transform="translate(${x} ${y}) scale(${scale}) rotate(-5 84 100)">
    <rect width="168" height="200" rx="12" fill="${palette.paper}" stroke="${palette.ink}" stroke-width="5"/>
    <path d="M28 36h94M28 61h111M28 86h82M28 126h105M28 151h82" stroke="${palette.ink}" stroke-width="6" stroke-linecap="round" opacity=".7"/>
    <rect x="28" y="102" width="36" height="16" rx="5" fill="${accent}"/>
    <path d="m112 155 10 10 21-25" fill="none" stroke="${palette.green}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
  </g>`;
}

function sceneStart(accent = palette.blueSoft) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 540" role="img" focusable="false">
  <path d="M86 388c33-91 122-134 219-123 79 9 109-26 194-15 91 12 155 67 187 151 18 47-20 91-69 91H145c-55 0-80-46-59-104Z" fill="${accent}" opacity=".5"/>
  <path d="M116 445h570" stroke="${palette.ink}" stroke-width="5" stroke-linecap="round" opacity=".55"/>
  <circle cx="105" cy="92" r="12" fill="${palette.coral}"/>
  <circle cx="135" cy="70" r="7" fill="${palette.yellow}"/>
  <circle cx="690" cy="98" r="11" fill="${palette.mint}" stroke="${palette.ink}" stroke-width="3"/>
`;
}

function sceneEnd() {
  return `</svg>\n`;
}

const scenes = [
  {
    file: "folveta-material-student.svg",
    alt: "Student organizing course materials at a study desk",
    body: async () => `${sceneStart(palette.blueSoft)}
      ${card(76, 142, 118, 74, palette.yellow, -8)}
      ${card(612, 126, 110, 72, palette.coral, 8)}
      ${desk(216, 370, 330, palette.paper)}
      ${group(await source("character11"), "translate(132 28) scale(.69)")}
      ${bookStack(560, 330, .63)}
      ${laptop(564, 242, .36, palette.mint)}
      ${marker(570, 185, palette.green)}
    ${sceneEnd()}`,
  },
  {
    file: "folveta-guide-student.svg",
    alt: "Student holding a study guide beside organized books",
    body: async () => `${sceneStart(palette.mint)}
      ${card(84, 123, 112, 76, palette.green, -7)}
      ${group(await source("character14"), "translate(98 34) scale(.68)")}
      ${bookStack(498, 310, .72)}
      ${card(566, 126, 126, 82, palette.blue, 6)}
      <path d="M605 171h45M605 188h31" stroke="${palette.greenDark}" stroke-width="4" stroke-linecap="round"/>
      ${marker(697, 230, palette.yellow)}
    ${sceneEnd()}`,
  },
  {
    file: "folveta-quick-check-student.svg",
    alt: "Student reviewing a checklist and calendar at a laptop",
    body: async () => `${sceneStart(palette.coralSoft)}
      ${calendar(54, 83, .42)}
      ${group(await source("character6"), "translate(208 36) scale(.72)")}
      ${desk(205, 371, 340, palette.paper)}
      ${bookStack(567, 331, .58)}
      ${card(584, 120, 128, 82, palette.yellow, 8)}
      ${marker(654, 170, palette.green)}
      <path d="M647 245c18 13 23 27 18 42" fill="none" stroke="${palette.blue}" stroke-width="5" stroke-linecap="round"/>
    ${sceneEnd()}`,
  },
  {
    file: "folveta-source-student.svg",
    alt: "Student checking a source page beside a laptop and notes",
    body: async () => `${sceneStart(palette.blueSoft)}
      ${group(await source("character15"), "translate(88 40) scale(.67)")}
      ${desk(286, 372, 320, palette.paper)}
      ${laptop(492, 238, .42, palette.blueSoft)}
      ${bookStack(570, 329, .54)}
      ${sourcePage(524, 78, .66, palette.blue)}
      ${card(530, 84, 132, 84, palette.blue, -5)}
      <path d="M573 122h54M573 140h38" stroke="${palette.greenDark}" stroke-width="4" stroke-linecap="round"/>
      ${marker(686, 215, palette.coral)}
    ${sceneEnd()}`,
  },
  {
    file: "folveta-progress-student.svg",
    alt: "Student tracking a study milestone beside a calendar",
    body: async () => `${sceneStart(palette.mint)}
      ${calendar(54, 94, .38)}
      ${group(await source("character16"), "translate(214 28) scale(.70)")}
      ${bookStack(544, 326, .60)}
      <circle cx="658" cy="145" r="47" fill="${palette.paper}" stroke="${palette.ink}" stroke-width="5"/>
      <path d="M658 110v35l22 14" fill="none" stroke="${palette.green}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
      ${marker(706, 205, palette.yellow)}
    ${sceneEnd()}`,
  },
  {
    file: "folveta-locked-student.svg",
    alt: "Student pausing beside a private study folder",
    body: async () => `${sceneStart(palette.coralSoft)}
      ${group(await source("character14"), "translate(82 48) scale(.62)")}
      <g transform="translate(474 130)">
        <path d="M10 58h218v144H10z" fill="${palette.yellow}" stroke="${palette.ink}" stroke-width="5" stroke-linejoin="round"/>
        <path d="M10 58h82l18-25h70l18 25h30" fill="${palette.coralSoft}" stroke="${palette.ink}" stroke-width="5" stroke-linejoin="round"/>
        <rect x="82" y="108" width="74" height="68" rx="12" fill="${palette.blueSoft}" stroke="${palette.ink}" stroke-width="5"/>
        <path d="M98 108v-18c0-13 9-24 21-24s21 11 21 24v18" fill="none" stroke="${palette.ink}" stroke-width="6" stroke-linecap="round"/>
        <circle cx="119" cy="138" r="6" fill="${palette.ink}"/>
        <path d="M119 144v14" stroke="${palette.ink}" stroke-width="5" stroke-linecap="round"/>
      </g>
      ${bookStack(245, 327, .55)}
      ${marker(667, 88, palette.green)}
    ${sceneEnd()}`,
  },
  {
    file: "folveta-heart-student.svg",
    alt: "Student returning to review cards and notes",
    body: async () => `${sceneStart(palette.blueSoft)}
      ${group(await source("character11"), "translate(126 36) scale(.66)")}
      ${card(520, 122, 126, 80, palette.coral, -9)}
      ${card(586, 176, 126, 80, palette.yellow, 8)}
      ${bookStack(504, 326, .56)}
      <path d="M640 294c42 8 57 36 37 61-17 22-50 18-67-2" fill="none" stroke="${palette.green}" stroke-width="7" stroke-linecap="round"/>
      <path d="m599 354 14-2-2 14" fill="none" stroke="${palette.green}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
      ${marker(122, 234, palette.coral)}
    ${sceneEnd()}`,
  },
];

await mkdir(outputRoot, { recursive: true });
for (const scene of scenes) {
  const svg = `<!-- Derived from ira-design/ira-illustrations (MIT), with Folveta palette and layout adaptations. Source files are kept in scripts/assets/vendor/ira. -->\n${await scene.body()}`;
  await writeFile(resolve(outputRoot, scene.file), svg);
}

await writeFile(
  resolve(outputRoot, "student-illustrations.json"),
  `${JSON.stringify({
    source: "https://github.com/ira-design/ira-illustrations",
    license: "MIT",
    builtBy: "scripts/assets/build-student-illustrations.mjs",
    palette,
    assets: scenes.map(({ file, alt }) => ({ file: `/illustrations/${file}`, alt })),
  }, null, 2)}\n`,
);

console.log(`Built ${scenes.length} student-focused SVG illustrations from IRA outline components.`);

import { access, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const fixtureDirectory = resolve("tests/fixtures");
await mkdir(fixtureDirectory, { recursive: true });

const pdf = await PDFDocument.create();
const font = await pdf.embedFont(StandardFonts.Helvetica);
const page1 = pdf.addPage([612, 792]);
page1.drawText("Cellular Respiration", { x: 54, y: 730, size: 24, font, color: rgb(0.05, 0.25, 0.16) });
page1.drawText("The electron transport chain pumps protons across the inner mitochondrial membrane.", { x: 54, y: 690, size: 12, font, maxWidth: 500 });
page1.drawText("The resulting proton gradient stores potential energy.", { x: 54, y: 665, size: 12, font });
const page2 = pdf.addPage([612, 792]);
page2.drawText("Chemiosmosis", { x: 54, y: 730, size: 24, font, color: rgb(0.05, 0.25, 0.16) });
page2.drawText("ATP synthase couples proton flow down the gradient to ATP production.", { x: 54, y: 690, size: 12, font });
await pdf.save().then((bytes) => writeFile(resolve(fixtureDirectory, "sample-course.pdf"), bytes));

// Keep the PPTX fixture as a checked-in, standards-compliant Office package.
// A partial hand-written OOXML archive can parse successfully while PowerPoint
// still repairs it and removes its contents.
await access(resolve(fixtureDirectory, "sample-course.pptx"));

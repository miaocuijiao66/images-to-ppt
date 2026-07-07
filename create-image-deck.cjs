const fs = require("node:fs/promises");
const path = require("node:path");
const { Presentation, PresentationFile } = require("@oai/artifact-tool");

const SLIDE_W = 1280;
const SLIDE_H = 720;
const IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".bmp",
  ".gif",
  ".tif",
  ".tiff",
  ".webp",
]);

function usage() {
  console.error(
    "Usage: node create-image-deck.cjs <imageDir> <outputPptx> <workspaceDir>",
  );
}

function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".bmp") return "image/bmp";
  if (ext === ".gif") return "image/gif";
  if (ext === ".tif" || ext === ".tiff") return "image/tiff";
  if (ext === ".webp") return "image/webp";
  return "application/octet-stream";
}

async function writeBlob(filePath, blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  await fs.writeFile(filePath, bytes);
}

async function ensureDirs(workspaceDir) {
  const tmpDir = path.join(workspaceDir, "tmp");
  const previewDir = path.join(tmpDir, "preview");
  const layoutDir = path.join(tmpDir, "layout");
  const qaDir = path.join(tmpDir, "qa");
  await fs.mkdir(previewDir, { recursive: true });
  await fs.mkdir(layoutDir, { recursive: true });
  await fs.mkdir(qaDir, { recursive: true });
  return { tmpDir, previewDir, layoutDir, qaDir };
}

async function findImages(imageDir) {
  const entries = await fs.readdir(imageDir, { withFileTypes: true });
  const images = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const filePath = path.join(imageDir, entry.name);
    if (!IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) continue;
    const stat = await fs.stat(filePath);
    images.push({
      name: entry.name,
      filePath,
      mtimeMs: stat.mtimeMs,
      mtime: stat.mtime,
      birthtime: stat.birthtime,
      size: stat.size,
    });
  }
  images.sort((a, b) => a.mtimeMs - b.mtimeMs || a.name.localeCompare(b.name));
  return images;
}

async function main() {
  const [imageDir, outputPptx, workspaceDir] = process.argv.slice(2);
  if (!imageDir || !outputPptx || !workspaceDir) {
    usage();
    process.exitCode = 2;
    return;
  }

  const { tmpDir, previewDir, layoutDir, qaDir } = await ensureDirs(workspaceDir);
  const images = await findImages(imageDir);
  if (images.length === 0) {
    throw new Error(`No supported image files found in ${imageDir}`);
  }

  const presentation = Presentation.create({
    slideSize: { width: SLIDE_W, height: SLIDE_H },
  });

  for (const [index, image] of images.entries()) {
    const slide = presentation.slides.add();
    slide.background.fill = "white";
    const bytes = await fs.readFile(image.filePath);
    slide.images.add({
      blob: bytes,
      contentType: contentTypeFor(image.filePath),
      alt: `Image ${index + 1} of ${images.length}, ${image.name}, modified ${image.mtime.toISOString()}`,
      fit: "contain",
      position: { left: 0, top: 0, width: SLIDE_W, height: SLIDE_H },
      geometry: "rect",
    });
  }

  const sourceNotes = [
    "Source notes",
    "",
    `Source folder: ${imageDir}`,
    `Sort key: file LastWriteTime / mtime ascending, then filename for ties.`,
    `Slide count: ${images.length}`,
    "",
    ...images.map(
      (image, index) =>
        `Slide ${index + 1}: ${image.name} | modified ${image.mtime.toISOString()} | created ${image.birthtime.toISOString()} | ${image.size} bytes`,
    ),
    "",
  ].join("\n");
  await fs.writeFile(path.join(tmpDir, "source-notes.txt"), sourceNotes, "utf8");

  const slidePlan = [
    "Slide plan",
    "",
    "Mode: create",
    "Deck structure: one user-provided image per slide.",
    "Canvas: 16:9 widescreen, 1280 x 720 px.",
    "Image fit: contain, centered in a full-slide frame to preserve the complete source image.",
    "Palette: white slide background behind contained images.",
    "Fonts: no visible text added.",
    "",
  ].join("\n");
  await fs.writeFile(path.join(tmpDir, "slide-plan.txt"), slidePlan, "utf8");

  for (const [index, slide] of presentation.slides.items.entries()) {
    const stem = `slide-${String(index + 1).padStart(2, "0")}`;
    await writeBlob(
      path.join(previewDir, `${stem}.png`),
      await presentation.export({ slide, format: "png", scale: 1 }),
    );
    await fs.writeFile(
      path.join(layoutDir, `${stem}.layout.json`),
      await (await slide.export({ format: "layout" })).text(),
      "utf8",
    );
  }

  await writeBlob(
    path.join(previewDir, "deck-montage.webp"),
    await presentation.export({ format: "webp", montage: true, scale: 1 }),
  );

  const pptx = await PresentationFile.exportPptx(presentation);
  await pptx.save(outputPptx);

  const outputStat = await fs.stat(outputPptx);
  const qa = [
    "Visual QA",
    "",
    `Generated PPTX: ${outputPptx}`,
    `Expected slide count: ${images.length}`,
    `Rendered slide previews: ${images.length}`,
    `Deck montage: ${path.join(previewDir, "deck-montage.webp")}`,
    `Output size: ${outputStat.size} bytes`,
    "Check summary: all slides rendered; images use contain fit to avoid cropping; no visible text boxes were added.",
    "Output directory note: the requested output directory is also the source image folder, so it intentionally contains the original images plus the final PPTX.",
    "",
  ].join("\n");
  await fs.writeFile(path.join(qaDir, "visual-qa.txt"), qa, "utf8");

  console.log(
    JSON.stringify(
      {
        outputPptx,
        slideCount: images.length,
        outputSize: outputStat.size,
        first: images[0],
        last: images[images.length - 1],
        previewDir,
        qaPath: path.join(qaDir, "visual-qa.txt"),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

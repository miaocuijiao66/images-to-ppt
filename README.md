# Images to PPT

A small local helper for turning a folder of images into a PowerPoint deck.

I created this tool for my own workflow when preparing slide materials from image batches. It is mainly a personal automation script rather than a fully packaged public npm tool.

## Usage

```powershell
node create-image-deck.cjs <imageDir> <outputPptx> <workspaceDir>
```

Example:

```powershell
node create-image-deck.cjs ".\images" ".\images\output.pptx" .
```

Arguments:

- `<imageDir>`: Folder containing the source images.
- `<outputPptx>`: Path for the generated PowerPoint file.
- `<workspaceDir>`: Working folder used for temporary render and QA outputs.

## Behavior

- Supports `.jpg`, `.jpeg`, `.png`, `.bmp`, `.gif`, `.tif`, `.tiff`, and `.webp`.
- Sorts images by modified time, then filename.
- Creates one 16:9 slide per image.
- Fits each image inside a white full-slide frame without cropping.

## Notes

This repository records a personal local workflow tool. Some dependencies may be environment-specific, so the script may need adaptation before reuse in a standard Node.js environment.

Generated and temporary files are ignored, including `tmp/`, `images/`, and `*.pptx`.

The `tmp/` folder may contain local absolute paths and rendered previews, so it should not be committed.

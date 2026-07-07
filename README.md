# images-to-ppt

Personal helper for turning a folder of images into a PowerPoint deck.

This project is mainly for my own workflow. It keeps the existing
`@oai/artifact-tool` dependency used by the current script, so it is not meant
to be a fully portable npm package.

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

- Supports common image formats such as `.jpg`, `.jpeg`, `.png`, `.bmp`,
  `.gif`, `.tif`, `.tiff`, and `.webp`.
- Sorts images by file modified time from oldest to newest, then by filename
  for ties.
- Creates one slide per image.
- Uses a 16:9 white slide with the image contained inside the full slide area.

## Notes Before Uploading

Generated files are intentionally ignored:

- `tmp/`
- `*.pptx`

The `tmp/` folder can contain local absolute paths and rendered previews, so it
should not be committed.

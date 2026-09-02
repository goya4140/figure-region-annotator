# FigureLabel

> 🇨🇳 中文使用手册：[`USAGE.zh-CN.md`](USAGE.zh-CN.md)

A lightweight, browser-based region annotation tool for the Figure-to-PPTX benchmark. Annotators only draw rectangular regions and assign one of six labels:

- `arrow`
- `shape`
- `image`
- `chart`
- `text`
- `equation`

The interface is inspired by the practical three-column workspace of [LabelRoboMaster](https://github.com/xinyang-go/LabelRoboMaster), while removing model inference, automatic labeling, four-point geometry, dataset conversion, and other RoboMaster-specific features.

## Features

- Draw normalized `xyxy` bounding boxes directly on an image.
- Move and resize existing regions.
- Change labels with the toolbar, inspector, or number keys 1–6.
- Navigate images with buttons or `N` / `P`.
- Undo with `Cmd/Ctrl + Z`; delete the selected box with `Delete`.
- Open a dataset folder containing an `images/` directory and exactly one root-level JSON file.
- Import and export a single portable JSON annotation file.
- Remove unsuitable images from the dataset together with their JSON entries. With writable folder access, the source image and JSON are updated on disk after confirmation.
- Autosave annotation state in browser local storage.
- Show the union coverage ratio of all marked regions on the current image; overlaps count once.
- Adjust annotation box line width from a 0.5 px hairline to 3 px.
- Four academic-figure samples are included for immediate testing.

## Run locally for annotation

```bash
npm install
npm start
```

The production build is served at `http://127.0.0.1:4173/` and the default browser opens automatically. The server only listens on the local computer: images and annotations are handled in the browser and are not uploaded to a remote service.

Annotators who do not use the terminal can double-click:

- macOS: `START_HERE.command`
- Windows: `START_HERE.bat`

The launcher installs project dependencies on first use and then opens the local annotation page. Keep the launcher window open while annotating; close it or press `Ctrl+C` to stop the local page.

For frontend development with hot reload, use `npm run dev` instead.

## Dataset folder format

```text
my-dataset/
├── images/
│   ├── figure-001.png
│   └── figure-002.jpg
└── annotations.json
```

The root folder must contain exactly one `.json` file. JSON entries are matched to files in `images/` by `file_name`. In browsers that support writable directory access, deleting an image after confirmation also removes the physical file and rewrites the JSON. Read-only folder fallback keeps the source files unchanged and applies deletion to the working dataset and next JSON export.

## JSON format

```json
{
  "version": "1.0",
  "coordinate_system": "normalized_xyxy",
  "labels": ["arrow", "shape", "image", "chart", "text", "equation"],
  "images": [
    {
      "image_id": "iclr-addp-fig2",
      "file_name": "iclr-addp-fig2.png",
      "regions": [
        {
          "id": "r-101",
          "label": "chart",
          "bbox": [0.056, 0.13, 0.322, 0.54]
        }
      ]
    }
  ]
}
```

Coordinates are normalized to the source image dimensions and stored as `[x1, y1, x2, y2]`.

## Design reference

The reference screenshot used during implementation is stored at [`docs/labelrobomaster-reference.png`](docs/labelrobomaster-reference.png). LabelRoboMaster is licensed under the MIT License by its original authors; this project is an independent web implementation tailored to Figure-to-PPTX region annotation.

## License

MIT

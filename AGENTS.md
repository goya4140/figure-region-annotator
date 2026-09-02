# Prototype Instructions

## Product decisions

- This is a desktop-first, browser-only annotation tool for the Figure-to-PPTX benchmark.
- Preserve the lightweight workflow: draw rectangular regions, assign exactly one of `arrow`, `shape`, `image`, `chart`, `text`, or `equation`, and exchange annotations as JSON.
- Do not add automatic labeling, model inference, accounts, a backend, collaboration, or dataset-management complexity unless explicitly requested.
- The visual reference is LabelRoboMaster: a practical central canvas with file controls on the left and annotation objects on the right, modernized without losing its dense labeling-workstation character.
- Show the current image's marked-area coverage as the union of all normalized rectangles divided by total page area; overlapping regions count once.
- Annotation borders default to a thin 1 px line, and users can adjust the display width from 0.5 px to 3 px without changing annotation geometry.
- The primary import unit is a dataset folder with an `images/` directory and exactly one root JSON file; match JSON image entries by `file_name`.
- Annotators can explicitly confirm that an unsuitable image should be removed. When writable directory access is available, remove the image file and synchronously rewrite the JSON; in read-only fallback mode, clearly state that deletion only affects the working dataset and exported JSON.
- The annotator-facing deployment is local-first: `npm start` and the macOS/Windows launchers serve the production UI on `127.0.0.1`, open the local page, and keep image and annotation handling on the annotator's computer without a remote backend.

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

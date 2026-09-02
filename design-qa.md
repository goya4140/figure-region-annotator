# Design QA

## Evidence

- Source visual truth: `docs/labelrobomaster-reference.png`
- Implementation screenshot: `docs/implementation-dataset-folder-delete.png`
- Side-by-side comparison: `docs/design-qa-comparison-dataset-folder-delete.jpg`
- Source pixels: 1501 × 831
- Implementation pixels: 1501 × 831
- Browser CSS viewport: 1501 × 831
- Browser device pixel ratio: 2; the browser screenshot API returned a CSS-pixel-normalized 1501 × 831 image, so no additional density scaling was required.
- State: first bundled sample, existing example annotations visible, 100% zoom.

## Full-view comparison evidence

The source and implementation were placed in the same 3002 × 891 comparison image. The implementation preserves the reference's defining workstation composition: a narrow file/action rail on the left, a dominant image canvas in the center, and an annotation list on the right. It intentionally modernizes the old Qt chrome while retaining its dense, practical labeling-tool character.

A separate focused crop was not required because both source and implementation are equal-size desktop captures and the full-resolution comparison keeps the toolbar, queue, canvas, bounding boxes, and region list readable. The reference's tiny source file paths are not product content that needs to be reproduced.

## Required fidelity surfaces

- Fonts and typography: Inter and IBM Plex Mono create a clear modern equivalent to the reference's utilitarian desktop typography. Hierarchy, small metadata, keyboard hints, and dense list rows remain legible.
- Spacing and layout rhythm: the three-column hierarchy is preserved. The central canvas receives most of the width; controls remain compact; left and right panels align to the same top and bottom grid.
- Colors and visual tokens: the reference's neutral gray application chrome is retained, with a restrained lime accent for active/ready states. Six annotation classes use distinct, repeatable colors.
- Image quality and asset fidelity: real bundled academic-figure images are used at native aspect ratio. No placeholder images, handcrafted SVG illustrations, or fake visual assets are present. Phosphor supplies the interface icons.
- Copy and content: all visible controls describe the Figure-to-PPTX region-labeling workflow. RoboMaster-specific automation, model, interpolation, and armor-class controls are absent by design.

## Interaction verification

- Drawing a new rectangular region: passed.
- Selecting and deleting a region: passed.
- Relabeling a selected region: passed.
- Undoing a relabel: passed.
- Previous/next image navigation: passed.
- Zoom controls: passed.
- Page coverage metric: passed. The displayed value updates after drawing and undoing a region, and overlapping regions are counted once through union-area calculation.
- Bounding-box line width: passed. The default is 1 px and the slider plus decrement/increment controls cover the supported 0.5–3 px range.
- Dataset-folder entry: passed. The primary left-panel action names the required `images/ + one JSON file` structure without changing the queue layout.
- Image removal confirmation: passed. A dedicated current-image trash action opens an explicit destructive confirmation and distinguishes writable on-disk deletion from read-only working-set removal.
- JSON export action and success state: passed. The in-app browser did not expose a download event, but the application showed the post-export success state and emitted no error.
- Browser console warnings/errors: none.

## Findings

No actionable P0, P1, or P2 visual or interaction differences remain. The implementation is not a pixel clone of the legacy Qt window; its modernized toolbar and label palette are intentional adaptations to the much smaller six-label workflow.

## Comparison history

- Initial pass: no P0/P1/P2 issues found. No visual fix iteration was required.
- Coverage/line-width pass: added a compact page-coverage card without changing the three-column layout. The first 0.5 px implementation used a CSS border, which the browser rounded visually; it was replaced with an inset box shadow so subpixel widths render correctly. Live coverage, undo, and line-width controls were verified in-browser with no console errors.
- Dataset-folder/delete pass: replaced the loose-image primary entry with a structured dataset-folder action, added one compact current-image delete control beside the image identity, and verified the confirmation layer at 1501 × 831. The canvas, label strip, zoom controls, and side panels retain their prior proportions. Folder parsing and JSON removal behavior are covered by unit tests; no browser console errors were emitted.

## Follow-up polish

- P3: a later iteration could add a user-selectable light/dark canvas background for unusually dark source figures.

## Implementation checklist

- [x] Preserve three-column annotation-workstation structure.
- [x] Keep the image canvas visually dominant.
- [x] Surface exactly six labels.
- [x] Use real sample assets.
- [x] Verify primary annotation interactions.
- [x] Verify union-area page coverage and overlap handling.
- [x] Verify adjustable 0.5–3 px bounding-box lines.
- [x] Validate dataset folder structure and JSON-to-image matching.
- [x] Protect image removal with an explicit confirmation and update JSON entries.
- [x] Confirm production build and Sites packaging tests.

final result: passed

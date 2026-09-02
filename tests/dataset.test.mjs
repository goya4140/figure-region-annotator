import test from "node:test";
import assert from "node:assert/strict";
import { baseName, buildDatasetState, buildExportPayload, validateDatasetFiles } from "../src/dataset.js";

const file = (name, relative) => ({ name, webkitRelativePath: relative });

test("finds one root JSON and images inside images folder", () => {
  const files = [
    file("annotations.json", "benchmark/annotations.json"),
    file("a.png", "benchmark/images/a.png"),
    file("notes.txt", "benchmark/notes.txt"),
  ];
  const result = validateDatasetFiles(files);
  assert.equal(result.datasetName, "benchmark");
  assert.equal(result.jsonFile.name, "annotations.json");
  assert.deepEqual(result.imageFiles.map((item) => item.name), ["a.png"]);
});

test("rejects folders without exactly one root JSON", () => {
  assert.throws(() => validateDatasetFiles([file("a.png", "benchmark/images/a.png")]), /exactly one JSON/);
});

test("matches image annotations by basename", () => {
  const payload = { images: [{ image_id: "paper-a", file_name: "images/a.png", regions: [{ id: "r1" }] }] };
  const result = buildDatasetState([file("a.png", "benchmark/images/a.png")], payload, (item) => `blob:${item.name}`);
  assert.equal(result.images[0].id, "paper-a");
  assert.deepEqual(result.annotations["paper-a"], [{ id: "r1" }]);
});

test("export omits a deleted image and its JSON entry", () => {
  const payload = buildExportPayload({
    images: [{ id: "keep", name: "keep.png" }],
    annotations: { keep: [{ id: "r1" }], removed: [{ id: "r2" }] },
    originalPayload: { project: "benchmark", images: [{ image_id: "removed", file_name: "removed.png" }] },
    activeImageId: "keep",
    imageSize: { width: 100, height: 80 },
  });
  assert.equal(payload.project, "benchmark");
  assert.deepEqual(payload.images.map((item) => item.image_id), ["keep"]);
  assert.deepEqual(payload.images[0].regions, [{ id: "r1" }]);
});

test("baseName accepts slash styles", () => {
  assert.equal(baseName("images/a.png"), "a.png");
  assert.equal(baseName("images\\a.png"), "a.png");
});

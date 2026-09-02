const IMAGE_PATTERN = /\.(png|jpe?g|webp)$/i;

export function isSupportedImageName(name) {
  return IMAGE_PATTERN.test(name);
}

export function baseName(path = "") {
  return path.split(/[\\/]/).filter(Boolean).at(-1) ?? "";
}

export function validateDatasetFiles(files) {
  const entries = [...files];
  const jsonFiles = entries.filter((file) => {
    const relative = file.webkitRelativePath || file.name;
    const parts = relative.split("/").filter(Boolean);
    return parts.length === 2 && file.name.toLowerCase().endsWith(".json");
  });
  const imageFiles = entries.filter((file) => {
    const relative = file.webkitRelativePath || file.name;
    const parts = relative.split("/").filter(Boolean);
    return parts.length >= 3 && parts.at(-2)?.toLowerCase() === "images" && isSupportedImageName(file.name);
  });

  if (jsonFiles.length !== 1) {
    throw new Error("The dataset folder must contain exactly one JSON file at its root.");
  }
  if (!imageFiles.length) {
    throw new Error("The dataset folder must contain an images folder with PNG, JPG, or WebP files.");
  }

  const firstPath = (entries[0]?.webkitRelativePath || "Dataset").split("/")[0];
  return { datasetName: firstPath || "Dataset", jsonFile: jsonFiles[0], imageFiles };
}

export function buildDatasetState(imageFiles, payload, createUrl = URL.createObjectURL) {
  const jsonImages = Array.isArray(payload?.images) ? payload.images : [];
  const byName = new Map(jsonImages.map((image) => [baseName(image.file_name).toLowerCase(), image]));
  const annotations = {};
  const images = imageFiles
    .filter((file) => isSupportedImageName(file.name))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
    .map((file, index) => {
      const entry = byName.get(file.name.toLowerCase());
      const id = entry?.image_id || `dataset-${index}-${file.name}`;
      annotations[id] = Array.isArray(entry?.regions) ? entry.regions : [];
      return {
        id,
        name: file.name,
        diskName: file.name,
        src: createUrl(file),
        source: "Dataset folder",
      };
    });

  return { images, annotations };
}

export function restoreMatchingAnnotations(images, fileAnnotations, savedAnnotations) {
  return Object.fromEntries(images.map((image) => [
    image.id,
    Array.isArray(savedAnnotations?.[image.id])
      ? savedAnnotations[image.id]
      : (fileAnnotations?.[image.id] ?? []),
  ]));
}

export function buildExportPayload({ images, annotations, originalPayload = {}, activeImageId, imageSize }) {
  return {
    ...originalPayload,
    version: originalPayload.version || "1.0",
    coordinate_system: originalPayload.coordinate_system || "normalized_xyxy",
    labels: originalPayload.labels || ["arrow", "shape", "image", "chart", "text", "equation"],
    images: images.map((image) => ({
      image_id: image.id,
      file_name: image.name,
      ...(image.id === activeImageId && imageSize?.width ? { image_size: imageSize } : {}),
      regions: annotations[image.id] ?? [],
    })),
  };
}

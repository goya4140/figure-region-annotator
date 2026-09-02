import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowCounterClockwise, ArrowLeft, ArrowRight, BoundingBox, CaretDown, Check,
  DownloadSimple, FileArrowUp, FolderOpen, ImageSquare, MagnifyingGlassMinus,
  MagnifyingGlassPlus, Minus, Plus, Trash, UploadSimple,
} from "@phosphor-icons/react";
import { buildDatasetState, buildExportPayload, isSupportedImageName, validateDatasetFiles } from "./dataset.js";
import { calculateUnionArea } from "./geometry.js";

const LABELS = [
  { id: "arrow", name: "Arrow", key: "1", color: "#ff6b57" },
  { id: "shape", name: "Shape", key: "2", color: "#5c8dff" },
  { id: "image", name: "Image", key: "3", color: "#a36df2" },
  { id: "chart", name: "Chart", key: "4", color: "#11a875" },
  { id: "text", name: "Text", key: "5", color: "#e49b18" },
  { id: "equation", name: "Equation", key: "6", color: "#d64f91" },
];

const SAMPLE_IMAGES = [
  { id: "iclr-addp-fig2", name: "iclr-addp-fig2.png", src: "/samples/iclr-addp-fig2.png", source: "Sample · ICLR" },
  { id: "paperbanana-test-221", name: "paperbanana-test-221.jpg", src: "/samples/paperbanana-test-221.jpg", source: "Sample · PaperBanana" },
  { id: "cvpr-sd4match-fig2", name: "cvpr-sd4match-fig2.png", src: "/samples/cvpr-sd4match-fig2.png", source: "Sample · CVPR" },
  { id: "iclr-usf-fig4", name: "iclr-usf-fig4.png", src: "/samples/iclr-usf-fig4.png", source: "Sample · ICLR" },
];

const SEED_ANNOTATIONS = {
  "iclr-addp-fig2": [
    { id: "r-101", label: "chart", bbox: [0.056, 0.13, 0.322, 0.54] },
    { id: "r-102", label: "image", bbox: [0.205, 0.56, 0.33, 0.91] },
    { id: "r-103", label: "arrow", bbox: [0.445, 0.42, 0.575, 0.58] },
  ],
  "paperbanana-test-221": [
    { id: "r-201", label: "text", bbox: [0.055, 0.075, 0.34, 0.17] },
    { id: "r-202", label: "chart", bbox: [0.31, 0.22, 0.55, 0.71] },
  ],
};

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const round = (value) => Number(value.toFixed(5));
const labelById = (id) => LABELS.find((label) => label.id === id) ?? LABELS[0];

function loadSavedAnnotations() {
  try {
    const saved = localStorage.getItem("figure-region-annotator:v1");
    return saved ? JSON.parse(saved) : SEED_ANNOTATIONS;
  } catch {
    return SEED_ANNOTATIONS;
  }
}

function loadStrokeWidth() {
  const saved = Number(localStorage.getItem("figure-region-annotator:stroke-width"));
  return saved >= 0.5 && saved <= 3 ? saved : 1;
}

function normalizedBox(start, end) {
  return [
    round(Math.min(start.x, end.x)), round(Math.min(start.y, end.y)),
    round(Math.max(start.x, end.x)), round(Math.max(start.y, end.y)),
  ];
}

function AppLogo() {
  return (
    <div className="app-logo" aria-label="Figure Region Annotator">
      <span className="logo-mark"><BoundingBox size={19} weight="bold" /></span>
      <span className="logo-copy"><strong>FigureLabel</strong><small>REGION ANNOTATOR</small></span>
    </div>
  );
}

export function App() {
  const [images, setImages] = useState(SAMPLE_IMAGES);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeLabel, setActiveLabel] = useState("arrow");
  const [annotations, setAnnotations] = useState(loadSavedAnnotations);
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [interaction, setInteraction] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [history, setHistory] = useState([]);
  const [notice, setNotice] = useState("Ready to annotate");
  const [strokeWidth, setStrokeWidth] = useState(loadStrokeWidth);
  const [datasetName, setDatasetName] = useState("Figure-to-PPTX Regions");
  const [datasetPayload, setDatasetPayload] = useState({});
  const [datasetAccess, setDatasetAccess] = useState("sample");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const folderInputRef = useRef(null);
  const jsonInputRef = useRef(null);
  const overlayRef = useRef(null);
  const datasetHandlesRef = useRef(null);

  const activeImage = images[activeIndex];
  const regions = annotations[activeImage?.id] ?? [];
  const coverageRatio = useMemo(
    () => calculateUnionArea(regions.map(({ bbox }) => bbox)),
    [regions],
  );
  const coveragePercent = `${(coverageRatio * 100).toFixed(1)}%`;
  const completedCount = useMemo(
    () => images.filter((image) => (annotations[image.id] ?? []).length > 0).length,
    [images, annotations],
  );

  useEffect(() => {
    localStorage.setItem("figure-region-annotator:v1", JSON.stringify(annotations));
  }, [annotations]);

  useEffect(() => {
    localStorage.setItem("figure-region-annotator:stroke-width", String(strokeWidth));
  }, [strokeWidth]);

  useEffect(() => {
    setSelectedId(null);
    setDraft(null);
    setInteraction(null);
    setZoom(1);
  }, [activeIndex]);

  const pushHistory = useCallback(() => {
    setHistory((items) => [...items.slice(-29), annotations]);
  }, [annotations]);

  const undo = useCallback(() => {
    if (!history.length) return;
    setAnnotations(history.at(-1));
    setHistory((items) => items.slice(0, -1));
    setSelectedId(null);
    setNotice("Last change undone");
  }, [history]);

  const updateActiveRegions = useCallback((updater) => {
    if (!activeImage) return;
    setAnnotations((current) => ({
      ...current,
      [activeImage.id]: updater(current[activeImage.id] ?? []),
    }));
  }, [activeImage]);

  const deleteRegion = useCallback((id = selectedId) => {
    if (!id) return;
    pushHistory();
    updateActiveRegions((items) => items.filter((region) => region.id !== id));
    setSelectedId(null);
    setNotice("Region deleted");
  }, [pushHistory, selectedId, updateActiveRegions]);

  const setRegionLabel = useCallback((id, label) => {
    pushHistory();
    updateActiveRegions((items) => items.map((region) => region.id === id ? { ...region, label } : region));
    setNotice(`Region changed to ${label}`);
  }, [pushHistory, updateActiveRegions]);

  const eventPoint = useCallback((event) => {
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: clamp((event.clientX - rect.left) / rect.width),
      y: clamp((event.clientY - rect.top) / rect.height),
    };
  }, []);

  const beginDraw = (event) => {
    if (event.button !== 0 || event.target !== overlayRef.current) return;
    const point = eventPoint(event);
    pushHistory();
    setSelectedId(null);
    setInteraction({ type: "draw", start: point, pointerId: event.pointerId });
    setDraft({ label: activeLabel, bbox: [point.x, point.y, point.x, point.y] });
    overlayRef.current.setPointerCapture(event.pointerId);
  };

  const beginMove = (event, region) => {
    event.stopPropagation();
    if (event.button !== 0) return;
    pushHistory();
    setSelectedId(region.id);
    setActiveLabel(region.label);
    setInteraction({ type: "move", id: region.id, start: eventPoint(event), bbox: [...region.bbox], pointerId: event.pointerId });
    overlayRef.current.setPointerCapture(event.pointerId);
  };

  const beginResize = (event, region, corner) => {
    event.stopPropagation();
    pushHistory();
    setSelectedId(region.id);
    setInteraction({ type: "resize", id: region.id, start: eventPoint(event), bbox: [...region.bbox], corner, pointerId: event.pointerId });
    overlayRef.current.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event) => {
    if (!interaction) return;
    const point = eventPoint(event);
    if (interaction.type === "draw") {
      setDraft({ label: activeLabel, bbox: normalizedBox(interaction.start, point) });
      return;
    }
    if (interaction.type === "move") {
      const dx = point.x - interaction.start.x;
      const dy = point.y - interaction.start.y;
      const [x1, y1, x2, y2] = interaction.bbox;
      const width = x2 - x1;
      const height = y2 - y1;
      const nextX1 = clamp(x1 + dx, 0, 1 - width);
      const nextY1 = clamp(y1 + dy, 0, 1 - height);
      updateActiveRegions((items) => items.map((region) => region.id === interaction.id
        ? { ...region, bbox: [round(nextX1), round(nextY1), round(nextX1 + width), round(nextY1 + height)] }
        : region));
      return;
    }
    const [x1, y1, x2, y2] = interaction.bbox;
    const next = [...interaction.bbox];
    if (interaction.corner.includes("w")) next[0] = clamp(point.x, 0, x2 - 0.005);
    if (interaction.corner.includes("e")) next[2] = clamp(point.x, x1 + 0.005, 1);
    if (interaction.corner.includes("n")) next[1] = clamp(point.y, 0, y2 - 0.005);
    if (interaction.corner.includes("s")) next[3] = clamp(point.y, y1 + 0.005, 1);
    updateActiveRegions((items) => items.map((region) => region.id === interaction.id ? { ...region, bbox: next.map(round) } : region));
  };

  const onPointerUp = (event) => {
    if (!interaction) return;
    if (interaction.type === "draw" && draft) {
      const [x1, y1, x2, y2] = draft.bbox;
      if (x2 - x1 > 0.008 && y2 - y1 > 0.008) {
        const id = `r-${Date.now().toString(36)}`;
        updateActiveRegions((items) => [...items, { id, label: draft.label, bbox: draft.bbox.map(round) }]);
        setSelectedId(id);
        setNotice(`${labelById(draft.label).name} region added`);
      } else {
        setHistory((items) => items.slice(0, -1));
      }
    } else {
      setNotice("Region updated");
    }
    setDraft(null);
    setInteraction(null);
    if (overlayRef.current?.hasPointerCapture(event.pointerId)) overlayRef.current.releasePointerCapture(event.pointerId);
  };

  const changeImage = useCallback((direction) => {
    setActiveIndex((index) => clamp(index + direction, 0, images.length - 1));
  }, [images.length]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (deleteTarget) {
        if (event.key === "Escape" && !deleteBusy) setDeleteTarget(null);
        return;
      }
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return;
      const label = LABELS.find((item) => item.key === event.key);
      if (label) {
        setActiveLabel(label.id);
        if (selectedId) setRegionLabel(selectedId, label.id);
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        undo();
      }
      if (event.key === "Delete" || event.key === "Backspace") deleteRegion();
      if (event.key.toLowerCase() === "n" || event.key === "ArrowRight") changeImage(1);
      if (event.key.toLowerCase() === "p" || event.key === "ArrowLeft") changeImage(-1);
      if (event.key === "Escape") {
        setSelectedId(null);
        setDraft(null);
        setInteraction(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [changeImage, deleteBusy, deleteRegion, deleteTarget, selectedId, setRegionLabel, undo]);

  const revokeImportedUrls = (items) => {
    for (const image of items) {
      if (image.src?.startsWith("blob:")) URL.revokeObjectURL(image.src);
    }
  };

  const applyDataset = async ({ name, jsonFile, imageFiles, handles = null, access = "readonly" }) => {
    const payload = JSON.parse(await jsonFile.text());
    const next = buildDatasetState(imageFiles, payload);
    if (!next.images.length) throw new Error("No supported images were found in the images folder.");
    next.images = next.images.map((image) => ({ ...image, source: `Dataset · ${name}` }));
    revokeImportedUrls(images);
    setImages(next.images);
    setAnnotations(next.annotations);
    setDatasetName(name);
    setDatasetPayload(payload);
    setDatasetAccess(access);
    datasetHandlesRef.current = handles;
    setActiveIndex(0);
    setSelectedId(null);
    setHistory([]);
    setImageSize({ width: 0, height: 0 });
    setNotice(`${next.images.length} images loaded from ${name}`);
  };

  const importDatasetFiles = async (event) => {
    try {
      const dataset = validateDatasetFiles(event.target.files);
      await applyDataset({
        name: dataset.datasetName,
        jsonFile: dataset.jsonFile,
        imageFiles: dataset.imageFiles,
        access: "readonly",
      });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not open this dataset folder");
    }
    event.target.value = "";
  };

  const openDatasetFolder = async () => {
    if (!("showDirectoryPicker" in window)) {
      folderInputRef.current?.click();
      return;
    }
    try {
      const rootHandle = await window.showDirectoryPicker({ mode: "readwrite" });
      const rootEntries = [];
      for await (const entry of rootHandle.values()) rootEntries.push(entry);
      const jsonHandles = rootEntries.filter((entry) => entry.kind === "file" && entry.name.toLowerCase().endsWith(".json"));
      const imagesHandle = rootEntries.find((entry) => entry.kind === "directory" && entry.name.toLowerCase() === "images");
      if (jsonHandles.length !== 1) throw new Error("The dataset folder must contain exactly one JSON file at its root.");
      if (!imagesHandle) throw new Error("The dataset folder must contain an images folder.");
      const imageFiles = [];
      for await (const entry of imagesHandle.values()) {
        if (entry.kind === "file" && isSupportedImageName(entry.name)) imageFiles.push(await entry.getFile());
      }
      if (!imageFiles.length) throw new Error("No PNG, JPG, or WebP files were found in images/.");
      await applyDataset({
        name: rootHandle.name,
        jsonFile: await jsonHandles[0].getFile(),
        imageFiles,
        handles: { rootHandle, imagesHandle, jsonHandle: jsonHandles[0] },
        access: "writable",
      });
    } catch (error) {
      if (error?.name !== "AbortError") setNotice(error instanceof Error ? error.message : "Could not open this dataset folder");
    }
  };

  const exportJson = () => {
    const payload = buildExportPayload({ images, annotations, originalPayload: datasetPayload, activeImageId: activeImage?.id, imageSize });
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${datasetName.replace(/[^a-z0-9_-]+/gi, "-").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice("Annotation JSON exported");
  };

  const importJson = async (event) => {
    const [file] = event.target.files;
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text());
      const next = { ...annotations };
      for (const image of payload.images ?? []) {
        const localImage = images.find((item) => item.id === image.image_id || item.name === image.file_name);
        if (localImage && Array.isArray(image.regions)) next[localImage.id] = image.regions;
      }
      pushHistory();
      setAnnotations(next);
      setNotice("Annotation JSON imported");
    } catch {
      setNotice("Could not read this JSON file");
    }
    event.target.value = "";
  };

  const writeDatasetJson = async (payload) => {
    const jsonHandle = datasetHandlesRef.current?.jsonHandle;
    if (!jsonHandle) return;
    const writable = await jsonHandle.createWritable();
    await writable.write(JSON.stringify(payload, null, 2));
    await writable.close();
  };

  const deleteCurrentImage = async () => {
    if (!deleteTarget || deleteBusy) return;
    setDeleteBusy(true);
    const target = deleteTarget;
    const targetIndex = images.findIndex((image) => image.id === target.id);
    const remainingImages = images.filter((image) => image.id !== target.id);
    const remainingAnnotations = { ...annotations };
    delete remainingAnnotations[target.id];
    const previousPayload = buildExportPayload({ images, annotations, originalPayload: datasetPayload, activeImageId: activeImage?.id, imageSize });
    const nextPayload = buildExportPayload({ images: remainingImages, annotations: remainingAnnotations, originalPayload: datasetPayload });

    try {
      if (datasetAccess === "writable") {
        await writeDatasetJson(nextPayload);
        try {
          await datasetHandlesRef.current.imagesHandle.removeEntry(target.diskName || target.name);
        } catch (error) {
          await writeDatasetJson(previousPayload);
          throw error;
        }
      }
      if (target.src?.startsWith("blob:")) URL.revokeObjectURL(target.src);
      setImages(remainingImages);
      setAnnotations(remainingAnnotations);
      setDatasetPayload(nextPayload);
      setActiveIndex(remainingImages.length ? Math.min(targetIndex, remainingImages.length - 1) : 0);
      setSelectedId(null);
      setHistory([]);
      setImageSize({ width: 0, height: 0 });
      setDeleteTarget(null);
      setNotice(datasetAccess === "writable"
        ? `${target.name} deleted from images/ and JSON`
        : `${target.name} removed from the working dataset; export JSON to save`);
    } catch {
      setNotice(`Could not delete ${target.name}; the dataset was left unchanged`);
    } finally {
      setDeleteBusy(false);
    }
  };

  const selectedRegion = regions.find((region) => region.id === selectedId);
  const progress = images.length ? Math.round((completedCount / images.length) * 100) : 0;

  return (
    <div className="app-shell" style={{ "--box-stroke": `${strokeWidth}px` }}>
      <header className="topbar">
        <AppLogo />
        <div className="topbar-center">
          <span className="project-label">BENCHMARK DATASET</span>
          <button className="project-select" type="button">{datasetName} <CaretDown size={14} weight="bold" /></button>
        </div>
        <div className="topbar-actions">
          <button className="button ghost" type="button" onClick={() => jsonInputRef.current?.click()}><UploadSimple size={17} /> Import JSON</button>
          <button className="button primary" type="button" onClick={exportJson}><DownloadSimple size={17} weight="bold" /> Export JSON</button>
        </div>
      </header>

      <div className="workspace">
        <aside className="file-panel">
          <div className="panel-heading">
            <div><span className="eyebrow">SOURCE IMAGES</span><h2>Image queue</h2></div>
            <button className="icon-button" type="button" aria-label="Open dataset folder" onClick={openDatasetFolder}><FolderOpen size={19} /></button>
          </div>
          <button className="import-card" type="button" onClick={openDatasetFolder}>
            <FileArrowUp size={22} /><span><strong>Open dataset folder</strong><small>images/ + one JSON file</small></span>
          </button>
          <div className="progress-block">
            <div className="progress-copy"><span>{completedCount} / {images.length} annotated</span><strong>{progress}%</strong></div>
            <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
          </div>
          <div className="image-list" aria-label="Image queue">
            {images.map((image, index) => {
              const count = (annotations[image.id] ?? []).length;
              return (
                <button className={`image-row ${index === activeIndex ? "active" : ""}`} key={image.id} type="button" onClick={() => setActiveIndex(index)}>
                  <img src={image.src} alt="" />
                  <span className="image-row-copy"><strong>{image.name}</strong><small>{image.source}</small></span>
                  <span className={`count-badge ${count ? "done" : ""}`}>{count || "–"}</span>
                </button>
              );
            })}
          </div>
          <div className="shortcut-note">
            <strong>Shortcuts</strong><span><kbd>1–6</kbd> label</span><span><kbd>N / P</kbd> next / previous</span><span><kbd>⌘ Z</kbd> undo</span>
          </div>
        </aside>

        <main className="canvas-column">
          <div className="canvas-toolbar">
            <div className="image-identity"><ImageSquare size={18} /><div><strong>{activeImage?.name || "No image selected"}</strong><small>{activeImage ? `${imageSize.width || "—"} × ${imageSize.height || "—"} px` : "Open a dataset folder"}</small></div></div>
            <button className="icon-button danger delete-image-button" type="button" aria-label="Remove current image from dataset" disabled={!activeImage} onClick={() => setDeleteTarget(activeImage)} title="Remove image from dataset"><Trash size={17} /></button>
            <div className="label-strip" aria-label="Annotation labels">
              {LABELS.map((label) => (
                <button key={label.id} type="button" className={`label-tool ${activeLabel === label.id ? "active" : ""}`} style={{ "--label-color": label.color }} onClick={() => { setActiveLabel(label.id); if (selectedId) setRegionLabel(selectedId, label.id); }}>
                  <span className="label-dot" />{label.name}<kbd>{label.key}</kbd>
                </button>
              ))}
            </div>
            <div className="zoom-controls">
              <button type="button" aria-label="Zoom out" onClick={() => setZoom((value) => clamp(value - 0.1, 0.6, 1.8))}><MagnifyingGlassMinus size={17} /></button>
              <span>{Math.round(zoom * 100)}%</span>
              <button type="button" aria-label="Zoom in" onClick={() => setZoom((value) => clamp(value + 0.1, 0.6, 1.8))}><MagnifyingGlassPlus size={17} /></button>
            </div>
          </div>

          <section className="canvas-workspace" aria-label="Annotation canvas">
            {activeImage && <div className="canvas-instructions"><span className="pulse-dot" /> Drag anywhere on the image to create a <strong>{activeLabel}</strong> region</div>}
            {activeImage ? <div className="image-stage" style={{ transform: `scale(${zoom})` }}>
              <img src={activeImage?.src} alt={activeImage?.name} draggable="false" onLoad={(event) => setImageSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })} />
              <div className="annotation-layer" ref={overlayRef} onPointerDown={beginDraw} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
                {regions.map((region, index) => {
                  const [x1, y1, x2, y2] = region.bbox;
                  const label = labelById(region.label);
                  const selected = region.id === selectedId;
                  return (
                    <div className={`region-box ${selected ? "selected" : ""}`} key={region.id} style={{ left: `${x1 * 100}%`, top: `${y1 * 100}%`, width: `${(x2 - x1) * 100}%`, height: `${(y2 - y1) * 100}%`, "--region-color": label.color }} onPointerDown={(event) => beginMove(event, region)}>
                      <span className="region-tag">{index + 1} · {label.name}</span>
                      {selected && ["nw", "ne", "sw", "se"].map((corner) => <button type="button" aria-label={`Resize ${corner}`} key={corner} className={`resize-handle ${corner}`} onPointerDown={(event) => beginResize(event, region, corner)} />)}
                    </div>
                  );
                })}
                {draft && <div className="region-box draft" style={{ left: `${draft.bbox[0] * 100}%`, top: `${draft.bbox[1] * 100}%`, width: `${(draft.bbox[2] - draft.bbox[0]) * 100}%`, height: `${(draft.bbox[3] - draft.bbox[1]) * 100}%`, "--region-color": labelById(draft.label).color }} />}
              </div>
            </div> : <div className="canvas-empty"><FolderOpen size={34} /><strong>No images in this dataset</strong><p>Open another dataset folder to continue labeling.</p></div>}
          </section>

          <footer className="canvas-footer">
            <div className="status-copy"><span className="status-light" />{notice}</div>
            <div className="navigation-controls">
              <button type="button" onClick={() => changeImage(-1)} disabled={activeIndex === 0}><ArrowLeft size={17} /> Previous</button>
              <strong>{images.length ? activeIndex + 1 : 0} <span>/ {images.length}</span></strong>
              <button type="button" onClick={() => changeImage(1)} disabled={activeIndex === images.length - 1}>Next <ArrowRight size={17} /></button>
            </div>
            <button className="undo-button" type="button" onClick={undo} disabled={!history.length}><ArrowCounterClockwise size={17} /> Undo</button>
          </footer>
        </main>

        <aside className="region-panel">
          <div className="panel-heading">
            <div><span className="eyebrow">ANNOTATIONS</span><h2>Regions <span>{regions.length}</span></h2></div>
            <button className="icon-button danger" type="button" aria-label="Delete selected region" disabled={!selectedId} onClick={() => deleteRegion()}><Trash size={18} /></button>
          </div>
          <div className="coverage-card">
            <div className="coverage-heading">
              <div><span className="eyebrow">PAGE COVERAGE</span><p>Unique marked area</p></div>
              <strong>{coveragePercent}</strong>
            </div>
            <div className="coverage-track" aria-label={`Marked page coverage ${coveragePercent}`}><span style={{ width: coveragePercent }} /></div>
            <small>Overlapping regions are counted once.</small>
          </div>
          {selectedRegion && (
            <div className="selection-editor">
              <span className="eyebrow">SELECTED REGION</span>
              <div className="selection-title"><strong>{selectedRegion.id}</strong><span style={{ background: labelById(selectedRegion.label).color }}>{selectedRegion.label}</span></div>
              <div className="mini-label-grid">
                {LABELS.map((label) => <button key={label.id} type="button" className={selectedRegion.label === label.id ? "active" : ""} style={{ "--label-color": label.color }} onClick={() => setRegionLabel(selectedRegion.id, label.id)}><span />{label.name}</button>)}
              </div>
              <dl className="bbox-readout">
                <div><dt>x1</dt><dd>{selectedRegion.bbox[0].toFixed(3)}</dd></div><div><dt>y1</dt><dd>{selectedRegion.bbox[1].toFixed(3)}</dd></div>
                <div><dt>x2</dt><dd>{selectedRegion.bbox[2].toFixed(3)}</dd></div><div><dt>y2</dt><dd>{selectedRegion.bbox[3].toFixed(3)}</dd></div>
              </dl>
            </div>
          )}
          <div className="region-list">
            {!regions.length && <div className="empty-state"><span><BoundingBox size={28} /></span><strong>No regions yet</strong><p>Choose a label above, then drag a box over an error-prone area.</p></div>}
            {regions.map((region, index) => {
              const label = labelById(region.label);
              return (
                <button key={region.id} type="button" className={`region-row ${region.id === selectedId ? "active" : ""}`} onClick={() => { setSelectedId(region.id); setActiveLabel(region.label); }}>
                  <span className="region-index" style={{ borderColor: label.color, color: label.color }}>{index + 1}</span>
                  <span className="region-copy"><strong>{label.name}</strong><small>{region.bbox.map((value) => value.toFixed(2)).join(" · ")}</small></span>
                  {region.id === selectedId && <Check size={16} weight="bold" />}
                </button>
              );
            })}
          </div>
          <div className="display-card">
            <div className="display-heading"><span className="eyebrow">BOX LINE WIDTH</span><output>{strokeWidth.toFixed(1)} px</output></div>
            <div className="line-width-control">
              <button type="button" aria-label="Decrease bounding box line width" disabled={strokeWidth <= 0.5} onClick={() => setStrokeWidth((value) => Math.max(0.5, value - 0.5))}><Minus size={13} weight="bold" /></button>
              <input
                aria-label="Bounding box line width"
                type="range"
                min="0.5"
                max="3"
                step="0.5"
                value={strokeWidth}
                onChange={(event) => setStrokeWidth(Number(event.target.value))}
              />
              <button type="button" aria-label="Increase bounding box line width" disabled={strokeWidth >= 3} onClick={() => setStrokeWidth((value) => Math.min(3, value + 0.5))}><Plus size={13} weight="bold" /></button>
            </div>
            <div className="range-labels"><span>Hairline</span><span>Bold</span></div>
          </div>
          <div className="schema-card"><span className="eyebrow">OUTPUT FORMAT</span><code>normalized_xyxy</code><p>Each box is stored as [x1, y1, x2, y2] in the 0–1 coordinate space.</p></div>
        </aside>
      </div>

      <input ref={folderInputRef} className="sr-only" type="file" webkitdirectory="" directory="" multiple onChange={importDatasetFiles} />
      <input ref={jsonInputRef} className="sr-only" type="file" accept="application/json" onChange={importJson} />
      {deleteTarget && (
        <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !deleteBusy) setDeleteTarget(null); }}>
          <section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-image-title" aria-describedby="delete-image-description">
            <span className="dialog-icon"><Trash size={22} weight="bold" /></span>
            <div>
              <span className="eyebrow">REMOVE FROM DATASET</span>
              <h2 id="delete-image-title">Delete {deleteTarget.name}?</h2>
              <p id="delete-image-description">{datasetAccess === "writable"
                ? "This permanently deletes the image from images/ and removes its entry from the dataset JSON. This cannot be undone."
                : "This removes the image and its JSON entry from the current working dataset. The original local file will stay on disk until you remove it manually."}</p>
            </div>
            <div className="dialog-actions">
              <button className="button ghost" type="button" disabled={deleteBusy} onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="button destructive" type="button" disabled={deleteBusy} onClick={deleteCurrentImage}>{deleteBusy ? "Deleting…" : "Delete image"}</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

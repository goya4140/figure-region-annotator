const clamp01 = (value) => Math.min(1, Math.max(0, Number(value) || 0));

export function calculateUnionArea(boxes) {
  const rectangles = boxes
    .map((bbox) => {
      const [rawX1, rawY1, rawX2, rawY2] = bbox ?? [];
      const x1 = clamp01(Math.min(rawX1, rawX2));
      const y1 = clamp01(Math.min(rawY1, rawY2));
      const x2 = clamp01(Math.max(rawX1, rawX2));
      const y2 = clamp01(Math.max(rawY1, rawY2));
      return { x1, y1, x2, y2 };
    })
    .filter(({ x1, y1, x2, y2 }) => x2 > x1 && y2 > y1);

  if (!rectangles.length) return 0;

  const xEdges = [...new Set(rectangles.flatMap(({ x1, x2 }) => [x1, x2]))].sort((a, b) => a - b);
  let area = 0;

  for (let index = 0; index < xEdges.length - 1; index += 1) {
    const left = xEdges[index];
    const right = xEdges[index + 1];
    if (right <= left) continue;

    const yIntervals = rectangles
      .filter(({ x1, x2 }) => x1 < right && x2 > left)
      .map(({ y1, y2 }) => [y1, y2])
      .sort((a, b) => a[0] - b[0]);

    let coveredY = 0;
    let currentStart = null;
    let currentEnd = null;
    for (const [start, end] of yIntervals) {
      if (currentStart === null) {
        currentStart = start;
        currentEnd = end;
      } else if (start <= currentEnd) {
        currentEnd = Math.max(currentEnd, end);
      } else {
        coveredY += currentEnd - currentStart;
        currentStart = start;
        currentEnd = end;
      }
    }
    if (currentStart !== null) coveredY += currentEnd - currentStart;
    area += (right - left) * coveredY;
  }

  return Math.min(1, area);
}

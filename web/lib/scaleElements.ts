import type { EditorElement } from "./editorTypes";

export function scaleElements(
  elements: EditorElement[],
  factor: number,
  originX: number,
  originY: number,
): EditorElement[] {
  if (factor === 1) {
    return structuredClone(elements);
  }

  return elements.map((el) => {
    const x = originX + (el.x - originX) * factor;
    const y = originY + (el.y - originY) * factor;

    if (el.type === "text") {
      return {
        ...el,
        x,
        y,
        fontSize: Math.max(8, Math.round(el.fontSize * factor)),
        width: Math.max(40, el.width * factor),
      };
    }
    if (el.type === "rect") {
      return {
        ...el,
        x,
        y,
        width: Math.max(4, el.width * factor),
        height: Math.max(4, el.height * factor),
        strokeWidth: Math.max(1, el.strokeWidth * factor),
      };
    }
    if (el.type === "line") {
      return {
        ...el,
        x,
        y,
        points: el.points.map((p, i) =>
          i % 2 === 0 ? originX + (p - originX) * factor : originY + (p - originY) * factor,
        ),
        strokeWidth: Math.max(1, el.strokeWidth * factor),
      };
    }
    return {
      ...el,
      x,
      y,
      width: Math.max(8, el.width * factor),
      height: Math.max(8, el.height * factor),
    };
  });
}

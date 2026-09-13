export type LabelSizeId = "85x62";

/** ~11.23 dots/mm (696 dots over 62 mm tape width). */
export const DOTS_PER_MM = 696 / 62;

export interface LabelSizeSpec {
  id: LabelSizeId;
  name: string;
  description: string;
  /** Ontwerp-canvas (zelfde orientatie als etiketten-app). */
  width: number;
  height: number;
  /** Brother media registry id (continuous roll). */
  mediaId: number;
  /** Draai ontwerp 90° met de klok mee vóór verzending naar de printer. */
  rotateBeforePrint: boolean;
}

export const LABEL_SIZES: Record<LabelSizeId, LabelSizeSpec> = {
  "85x62": {
    id: "85x62",
    name: "85 × 62 mm",
    description: "DK-22205 (62 mm doorlopend), zoals IC-etiketten",
    width: Math.round(85 * DOTS_PER_MM),
    height: Math.round(62 * DOTS_PER_MM),
    mediaId: 259,
    rotateBeforePrint: true,
  },
};

export function getLabelSize(id: string): LabelSizeSpec | undefined {
  return LABEL_SIZES[id as LabelSizeId];
}

export function getPrintPixelSize(spec: LabelSizeSpec): { width: number; height: number } {
  if (spec.rotateBeforePrint) {
    return { width: spec.height, height: spec.width };
  }
  return { width: spec.width, height: spec.height };
}

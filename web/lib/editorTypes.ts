export type ElementType = "text" | "rect" | "line" | "icon";

export interface BaseElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
}

export interface TextElement extends BaseElement {
  type: "text";
  text: string;
  fontSize: number;
  fontStyle: "normal" | "bold";
  fill: string;
  width: number;
  align: "left" | "center" | "right";
}

export interface RectElement extends BaseElement {
  type: "rect";
  width: number;
  height: number;
  stroke: string;
  strokeWidth: number;
  fill?: string;
}

export interface LineElement extends BaseElement {
  type: "line";
  points: number[];
  stroke: string;
  strokeWidth: number;
}

export interface IconElement extends BaseElement {
  type: "icon";
  iconId: string;
  width: number;
  height: number;
}

export type EditorElement = TextElement | RectElement | LineElement | IconElement;

export interface EditorDocument {
  labelSizeId: string;
  elements: EditorElement[];
}

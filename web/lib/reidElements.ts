import { v4 as uuid } from "uuid";
import type { EditorElement } from "./editorTypes";

/** Unieke id's bij laden van sjablonen (voorkomt vaste id's zoals t-owner). */
export function reidElements(elements: EditorElement[]): EditorElement[] {
  return elements.map((el) => ({ ...el, id: uuid() }));
}

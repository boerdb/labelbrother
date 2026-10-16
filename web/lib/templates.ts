import type { EditorElement } from "./editorTypes";

export interface LabelTemplate {
  id: string;
  name: string;
  description: string;
  elements: EditorElement[];
}

/** Posities voor 85×62 mm canvas (954×696 px). Grotere defaults voor leesbare print. */
export const BUILTIN_TEMPLATES: LabelTemplate[] = [
  {
    id: "datum",
    name: "Alleen datum",
    description: "Grote datumtekst",
    elements: [
      {
        id: "t-datum",
        type: "text",
        x: 40,
        y: 280,
        text: new Date().toLocaleDateString("nl-NL"),
        fontSize: 96,
        fontStyle: "bold",
        fill: "#000000",
        width: 874,
        align: "center",
      },
    ],
  },
  {
    id: "titel-regel",
    name: "Titel + regel",
    description: "Kop en ondertitel met rand",
    elements: [
      {
        id: "t-title",
        type: "text",
        x: 40,
        y: 100,
        text: "Titel",
        fontSize: 72,
        fontStyle: "bold",
        fill: "#000000",
        width: 874,
        align: "center",
      },
      {
        id: "t-sub",
        type: "text",
        x: 40,
        y: 480,
        text: "Ondertitel of toelichting",
        fontSize: 52,
        fontStyle: "normal",
        fill: "#000000",
        width: 874,
        align: "center",
      },
      {
        id: "frame",
        type: "rect",
        x: 20,
        y: 20,
        width: 914,
        height: 656,
        stroke: "#000000",
        strokeWidth: 5,
      },
    ],
  },
  {
    id: "eigendom",
    name: "Eigendom van",
    description: "Naam + icoon",
    elements: [
      {
        id: "icon-home",
        type: "icon",
        x: 70,
        y: 250,
        iconId: "home",
        width: 130,
        height: 130,
      },
      {
        id: "t-own",
        type: "text",
        x: 220,
        y: 255,
        text: "Eigendom van",
        fontSize: 48,
        fontStyle: "normal",
        fill: "#000000",
        width: 680,
        align: "left",
      },
      {
        id: "t-owner",
        type: "text",
        x: 220,
        y: 320,
        text: "Jouw naam",
        fontSize: 72,
        fontStyle: "bold",
        fill: "#000000",
        width: 680,
        align: "left",
      },
    ],
  },
];

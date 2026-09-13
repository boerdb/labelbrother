export interface IconDef {
  id: string;
  label: string;
  src: string;
}

export const ICON_LIBRARY: IconDef[] = [
  { id: "home", label: "Huis", src: "/icons/home.svg" },
  { id: "plug", label: "Stekker", src: "/icons/plug.svg" },
  { id: "warning", label: "Waarschuwing", src: "/icons/warning.svg" },
  { id: "calendar", label: "Kalender", src: "/icons/calendar.svg" },
  { id: "arrow-right", label: "Pijl", src: "/icons/arrow-right.svg" },
  { id: "box", label: "Doos", src: "/icons/box.svg" },
];

export function getIconSrc(iconId: string): string | undefined {
  return ICON_LIBRARY.find((i) => i.id === iconId)?.src;
}

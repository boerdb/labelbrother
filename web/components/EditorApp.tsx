"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { v4 as uuid } from "uuid";
import dynamic from "next/dynamic";
import type { LabelCanvasHandle } from "@/components/LabelCanvas";
import { CANVAS_PADDING } from "@/components/LabelCanvas";
import IconsPanel from "@/components/IconsPanel";
import Inspector from "@/components/Inspector";
import TemplatesPanel from "@/components/TemplatesPanel";
import { Icon, type IconName } from "@/components/ui/Icon";
import type { EditorElement, TextElement } from "@/lib/editorTypes";
import { getAllIcons, type IconDef } from "@/lib/icons";
import { LABEL_SIZES, type LabelSizeId } from "@/lib/labelSizes";
import {
  DEFAULT_PHOMEMO_LABEL,
  getPhomemoPrinter,
  isWebBluetoothAvailable,
  renderForPhomemo,
  type PhomemoLabel,
} from "@/lib/phomemo";
import { reidElements } from "@/lib/reidElements";
import { scaleElements } from "@/lib/scaleElements";

const LabelCanvas = dynamic(() => import("@/components/LabelCanvas"), { ssr: false });

const SETTINGS_KEY = "brotherdruk-settings";
const ICON_SIZE = 160;
const HISTORY_LIMIT = 50;
const COMPACT_QUERY = "(max-width: 1100px)";

type PrinterKind = "brother" | "phomemo";

interface AppSettings {
  apiKey: string;
  printer: PrinterKind;
  phomemoLabel: PhomemoLabel;
}

const DEFAULT_SETTINGS: AppSettings = {
  apiKey: "",
  printer: "brother",
  phomemoLabel: DEFAULT_PHOMEMO_LABEL,
};

function validMm(value: unknown, fallback: number): number {
  return typeof value === "number" && value >= 10 && value <= 300 ? value : fallback;
}

type Panel = "add" | "icons" | "templates" | "inspect";
type PrinterState = "checking" | "online" | "offline";
type ToastKind = "info" | "success" | "error";

interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
  action?: { label: string; run: () => void };
}

function loadSettings(): AppSettings {
  try {
    const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}") as Partial<AppSettings>;
    return {
      apiKey: typeof raw.apiKey === "string" ? raw.apiKey : "",
      printer: raw.printer === "phomemo" ? "phomemo" : "brother",
      phomemoLabel: {
        lengthMm: validMm(raw.phomemoLabel?.lengthMm, DEFAULT_PHOMEMO_LABEL.lengthMm),
        widthMm: validMm(raw.phomemoLabel?.widthMm, DEFAULT_PHOMEMO_LABEL.widthMm),
      },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const update = () => setMatches(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, [query]);
  return matches;
}

const PANELS: { id: Panel; label: string; icon: IconName }[] = [
  { id: "add", label: "Toevoegen", icon: "shapes" },
  { id: "icons", label: "Icons", icon: "smile" },
  { id: "templates", label: "Sjablonen", icon: "layout" },
  { id: "inspect", label: "Eigenschappen", icon: "sliders" },
];

export default function EditorApp() {
  const labelSizeId: LabelSizeId = "85x62";
  const spec = LABEL_SIZES[labelSizeId];
  const canvasRef = useRef<LabelCanvasHandle>(null);
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const textContentRef = useRef<HTMLTextAreaElement>(null);
  const settingsRef = useRef<HTMLDialogElement>(null);
  const isCompact = useMediaQuery(COMPACT_QUERY);

  const [elements, setElements] = useState<EditorElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const undoRef = useRef<EditorElement[][]>([]);
  const redoRef = useRef<EditorElement[][]>([]);
  const [, setHistoryTick] = useState(0);
  const [panel, setPanel] = useState<Panel>("add");
  const [zoomMode, setZoomMode] = useState<"fit" | number>("fit");
  const [fitZoom, setFitZoom] = useState(42);
  const [printing, setPrinting] = useState(false);
  const [printer, setPrinter] = useState<{ state: PrinterState; message: string }>({
    state: "checking",
    message: "Printer controleren…",
  });
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [phomemo, setPhomemo] = useState<{ name: string | null; connected: boolean; battery: number | null }>({
    name: null,
    connected: false,
    battery: null,
  });
  const [connecting, setConnecting] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const elementsRef = useRef(elements);
  elementsRef.current = elements;

  const selected = useMemo(
    () => elements.find((e) => e.id === selectedId) ?? null,
    [elements, selectedId],
  );
  const zoom = zoomMode === "fit" ? fitZoom : zoomMode;
  const activePanel: Panel = !isCompact && panel === "inspect" ? "add" : panel;

  /* ---------- meldingen ---------- */

  const notify = useCallback((kind: ToastKind, message: string, action?: Toast["action"]) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev.slice(-2), { id, kind, message, action }]);
    window.setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      kind === "error" ? 8000 : action ? 9000 : 3500,
    );
  }, []);

  const dismissToast = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  /* ---------- geschiedenis ---------- */

  const snapshot = useCallback(() => {
    const current = structuredClone(elementsRef.current);
    const last = undoRef.current.at(-1);
    if (!last || JSON.stringify(last) !== JSON.stringify(current)) {
      undoRef.current = [...undoRef.current.slice(-HISTORY_LIMIT), current];
    }
    redoRef.current = [];
    setHistoryTick((n) => n + 1);
  }, []);

  const commit = useCallback(
    (next: EditorElement[]) => {
      snapshot();
      setElements(next);
    },
    [snapshot],
  );

  const patchLive = useCallback((id: string, patch: Partial<EditorElement>) => {
    setElements((curr) => curr.map((el) => (el.id === id ? ({ ...el, ...patch } as EditorElement) : el)));
  }, []);

  const patchCommit = useCallback(
    (id: string, patch: Partial<EditorElement>) => {
      snapshot();
      patchLive(id, patch);
    },
    [patchLive, snapshot],
  );

  const undo = useCallback(() => {
    const prev = undoRef.current.at(-1);
    if (!prev) return;
    undoRef.current = undoRef.current.slice(0, -1);
    redoRef.current = [...redoRef.current, structuredClone(elementsRef.current)];
    setElements(prev);
    setHistoryTick((n) => n + 1);
  }, []);

  const redo = useCallback(() => {
    const next = redoRef.current.at(-1);
    if (!next) return;
    redoRef.current = redoRef.current.slice(0, -1);
    undoRef.current = [...undoRef.current, structuredClone(elementsRef.current)];
    setElements(next);
    setHistoryTick((n) => n + 1);
  }, []);

  /* ---------- selectie ---------- */

  const select = useCallback(
    (id: string | null) => {
      setSelectedId(id);
      if (isCompact) {
        if (id) setPanel("inspect");
        else setPanel((p) => (p === "inspect" ? "add" : p));
      }
    },
    [isCompact],
  );

  useEffect(() => {
    if (selectedId && !elements.some((e) => e.id === selectedId)) setSelectedId(null);
  }, [elements, selectedId]);

  const focusText = () => window.setTimeout(() => textContentRef.current?.select(), 30);

  /* ---------- elementen toevoegen ---------- */

  const center = { x: spec.width / 2, y: spec.height / 2 };

  const addElement = (el: EditorElement) => {
    commit([...elementsRef.current, el]);
    select(el.id);
  };

  const addText = (preset: "body" | "title" | "date") => {
    const fontSize = preset === "title" ? 96 : preset === "date" ? 72 : 56;
    const el: TextElement = {
      id: uuid(),
      type: "text",
      x: 40,
      y: center.y - fontSize / 2,
      text:
        preset === "date"
          ? new Date().toLocaleDateString("nl-NL")
          : preset === "title"
            ? "Titel"
            : "Nieuwe tekst",
      fontSize,
      fontStyle: preset === "body" ? "normal" : "bold",
      fill: "#000000",
      width: spec.width - 80,
      align: "center",
    };
    addElement(el);
    focusText();
  };

  const addRect = (variant: "frame" | "box") => {
    const width = variant === "frame" ? spec.width - 40 : 300;
    const height = variant === "frame" ? spec.height - 40 : 160;
    addElement({
      id: uuid(),
      type: "rect",
      x: center.x - width / 2,
      y: center.y - height / 2,
      width,
      height,
      stroke: "#000000",
      strokeWidth: variant === "frame" ? 6 : 4,
      cornerRadius: variant === "frame" ? 24 : 0,
    });
  };

  const addLine = (dashed = false) => {
    addElement({
      id: uuid(),
      type: "line",
      x: 0,
      y: 0,
      points: [40, center.y, spec.width - 40, center.y],
      stroke: "#000000",
      strokeWidth: 4,
      dashed,
    });
  };

  const addIcon = (icon: IconDef, at?: { x: number; y: number }) => {
    const pos = at ?? center;
    addElement({
      id: uuid(),
      type: "icon",
      x: pos.x - ICON_SIZE / 2,
      y: pos.y - ICON_SIZE / 2,
      iconId: icon.id,
      src: icon.src,
      width: ICON_SIZE,
      height: ICON_SIZE,
    });
  };

  /* ---------- acties op selectie / label ---------- */

  const applyTemplate = (templateElements: EditorElement[], scale: number, name: string) => {
    const factor = scale / 100;
    const scaled = scaleElements(structuredClone(templateElements), factor, center.x, center.y);
    commit(reidElements(scaled));
    select(null);
    notify("success", `Sjabloon “${name}” geladen`, { label: "Ongedaan maken", run: () => undo() });
  };

  const scaleAll = (factor: number) => {
    if (elements.length === 0) return;
    commit(scaleElements(elements, factor, center.x, center.y));
  };

  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    commit(elementsRef.current.filter((e) => e.id !== selectedId));
    select(null);
  }, [commit, select, selectedId]);

  const duplicateSelected = useCallback(() => {
    const source = elementsRef.current.find((e) => e.id === selectedId);
    if (!source) return;
    const copy = structuredClone(source);
    copy.id = uuid();
    if (copy.type === "line") {
      copy.points = copy.points.map((p, i) => p + (i % 2 === 0 ? 24 : 24));
    } else {
      copy.x += 24;
      copy.y += 24;
    }
    commit([...elementsRef.current, copy]);
    select(copy.id);
  }, [commit, select, selectedId]);

  const nudgeSelected = useCallback(
    (dx: number, dy: number) => {
      const el = elementsRef.current.find((e) => e.id === selectedId);
      if (!el) return;
      if (el.type === "line") {
        patchCommit(el.id, { points: el.points.map((p, i) => p + (i % 2 === 0 ? dx : dy)) });
      } else {
        patchCommit(el.id, { x: el.x + dx, y: el.y + dy });
      }
    },
    [patchCommit, selectedId],
  );

  const reorderSelected = (direction: "front" | "back") => {
    const el = elementsRef.current.find((e) => e.id === selectedId);
    if (!el) return;
    const rest = elementsRef.current.filter((e) => e.id !== el.id);
    commit(direction === "front" ? [...rest, el] : [el, ...rest]);
  };

  const centerSelected = (axis: "h" | "v") => {
    if (!selected) return;
    if (selected.type === "line") {
      const xs = selected.points.filter((_, i) => i % 2 === 0);
      const ys = selected.points.filter((_, i) => i % 2 === 1);
      const dx = axis === "h" ? center.x - (Math.min(...xs) + Math.max(...xs)) / 2 : 0;
      const dy = axis === "v" ? center.y - (Math.min(...ys) + Math.max(...ys)) / 2 : 0;
      patchCommit(selected.id, { points: selected.points.map((p, i) => p + (i % 2 === 0 ? dx : dy)) });
      return;
    }
    if (axis === "h") {
      patchCommit(selected.id, { x: center.x - selected.width / 2 });
      return;
    }
    const height =
      selected.type === "text"
        ? selected.fontSize * 1.1 * selected.text.split("\n").length
        : selected.height;
    patchCommit(selected.id, { y: center.y - height / 2 });
  };

  const clearCanvas = () => {
    if (elements.length === 0) return;
    commit([]);
    select(null);
    notify("info", "Label gewist", { label: "Ongedaan maken", run: () => undo() });
  };


  /* ---------- printer ---------- */

  const apiHeaders = useCallback((): HeadersInit => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const apiKey = settings.apiKey.trim();
    if (apiKey) headers["X-API-Key"] = apiKey;
    return headers;
  }, [settings.apiKey]);

  const checkPrinter = useCallback(
    async (announce = false) => {
      setPrinter({ state: "checking", message: "Printer controleren…" });
      try {
        const res = await fetch("/api/status", {
          headers: apiHeaders(),
          cache: "no-store",
          signal: AbortSignal.timeout(15000),
        });
        const data = (await res.json()) as { ok: boolean; error?: string; message?: string };
        if (!res.ok || !data.ok) throw new Error(data.error ?? data.message ?? "Niet bereikbaar");
        const message = data.message ?? "Printer bereikbaar";
        setPrinter({ state: "online", message });
        if (announce) notify("success", message);
      } catch (e) {
        const message = e instanceof Error ? e.message : "Niet bereikbaar";
        setPrinter({ state: "offline", message });
        if (announce) notify("error", message);
      }
    },
    [apiHeaders, notify],
  );

  useEffect(() => {
    const loaded = loadSettings();
    setSettings(loaded);
  }, []);

  useEffect(() => {
    if (settings.printer === "brother") void checkPrinter();
  }, [checkPrinter, settings.printer]);

  useEffect(() => {
    if (settings.printer !== "phomemo" || !isWebBluetoothAvailable()) return;
    const ph = getPhomemoPrinter();
    const sync = () =>
      setPhomemo({ name: ph.getDeviceName(), connected: ph.isConnected(), battery: ph.getBatteryLevel() });
    const unsub = ph.onStateChange(sync);
    sync();
    if (!ph.isConnected()) void ph.autoReconnect();
    return () => {
      unsub();
    };
  }, [settings.printer]);

  /** Opent de Bluetooth-kiezer; alleen aanroepen vanuit een klik of toets. */
  const connectPhomemo = async (): Promise<boolean> => {
    if (!isWebBluetoothAvailable()) {
      notify("error", "Bluetooth werkt alleen in Chrome of Edge (via HTTPS of localhost), niet in Safari/iOS.");
      return false;
    }
    setConnecting(true);
    try {
      const ok = await getPhomemoPrinter().connect();
      if (ok) notify("success", `Verbonden met ${getPhomemoPrinter().getDeviceName()}`);
      else notify("info", "Geen printer gekozen");
      return ok;
    } catch (e) {
      notify("error", e instanceof Error ? e.message : "Koppelen mislukt");
      return false;
    } finally {
      setConnecting(false);
    }
  };

  const printLabel = async () => {
    if (elements.length === 0 || printing) return;
    const ph = settings.printer === "phomemo" ? getPhomemoPrinter() : null;
    // Nog nooit gekoppeld: kiezer direct openen, zolang de klik nog als gebruikersactie telt.
    if (ph && !ph.getDeviceName() && !(await connectPhomemo())) return;
    setPrinting(true);
    try {
      const image = await canvasRef.current?.exportPng();
      if (!image) throw new Error("Kon label niet exporteren");
      if (ph) {
        await ph.print(await renderForPhomemo(image, settings.phomemoLabel));
        notify("success", "Label afgedrukt op Phomemo");
        return;
      }
      const res = await fetch("/api/print", {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify({ labelSize: labelSizeId, image }),
        signal: AbortSignal.timeout(120_000),
      });
      let data: { ok?: boolean; error?: string; jobId?: string };
      try {
        data = (await res.json()) as typeof data;
      } catch {
        throw new Error(`Server antwoordde niet (${res.status}). Draait de app op dezelfde URL?`);
      }
      if (!res.ok || !data.ok || !data.jobId) {
        throw new Error(data.error ?? `Afdrukken mislukt (HTTP ${res.status})`);
      }

      const jobId = data.jobId;
      const deadline = Date.now() + 120_000;
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 500));
        const poll = await fetch(`/api/print?jobId=${encodeURIComponent(jobId)}`, {
          headers: apiHeaders(),
          signal: AbortSignal.timeout(15_000),
        });
        let pollData: { ok?: boolean; status?: string; error?: string };
        try {
          pollData = (await poll.json()) as typeof pollData;
        } catch {
          continue;
        }
        if (!poll.ok || !pollData.ok) throw new Error(pollData.error ?? "Printstatus onbekend");
        if (pollData.status === "done") {
          notify("success", "Label afgedrukt");
          setPrinter((p) => ({ ...p, state: "online" }));
          return;
        }
        if (pollData.status === "error") throw new Error(pollData.error ?? "Print mislukt op de server");
      }
      throw new Error("Print duurde te lang — controleer de printer");
    } catch (e) {
      if (e instanceof DOMException && e.name === "TimeoutError") {
        notify("error", "Verbinding time-out. Probeer opnieuw of ververs de pagina.");
      } else {
        notify("error", e instanceof Error ? e.message : "Afdrukken mislukt");
      }
    } finally {
      setPrinting(false);
    }
  };

  const persistSettings = (next: AppSettings) => {
    setSettings(next);
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    } catch {
      /* opslag niet beschikbaar */
    }
  };

  /* ---------- zoom passend maken ---------- */

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth - CANVAS_PADDING * 2 - 32;
      const h = el.clientHeight - CANVAS_PADDING * 2 - 112;
      const fit = Math.min(w / spec.width, h / spec.height) * 100;
      setFitZoom(Math.max(15, Math.min(150, Math.floor(fit))));
    };
    measure();
    const ro = new ResizeObserver(() => requestAnimationFrame(measure));
    ro.observe(el);
    return () => ro.disconnect();
  }, [spec.width, spec.height, isCompact]);

  const stepZoom = (dir: 1 | -1) => {
    const next = Math.round((zoom + dir * 10) / 10) * 10;
    setZoomMode(Math.max(15, Math.min(200, next)));
  };

  /* ---------- toetsenbord ---------- */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      if (mod && key === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (mod && key === "y") {
        e.preventDefault();
        redo();
      } else if (mod && key === "d") {
        e.preventDefault();
        duplicateSelected();
      } else if (mod && key === "p") {
        e.preventDefault();
        void printLabelRef.current();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (!selectedId) return;
        e.preventDefault();
        deleteSelected();
      } else if (e.key === "Escape") {
        select(null);
      } else if (e.key.startsWith("Arrow") && selectedId) {
        e.preventDefault();
        const step = e.shiftKey ? 22 : 2;
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        nudgeSelected(dx, dy);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deleteSelected, duplicateSelected, nudgeSelected, redo, select, selectedId, undo]);

  const printLabelRef = useRef(printLabel);
  printLabelRef.current = printLabel;

  /* ---------- weergave ---------- */

  const usePhomemo = settings.printer === "phomemo";
  const printerLabel =
    printer.state === "online" ? "Printer klaar" : printer.state === "offline" ? "Printer offline" : "Controleren…";
  const phomemoState: PrinterState = connecting ? "checking" : phomemo.connected ? "online" : "offline";
  const phomemoLabel = connecting
    ? "Koppelen…"
    : phomemo.connected
      ? `${phomemo.name ?? "Phomemo"}${phomemo.battery != null ? ` · ${phomemo.battery}%` : ""}`
      : phomemo.name
        ? "Phomemo niet verbonden"
        : "Phomemo koppelen";
  const pill = usePhomemo
    ? {
        state: phomemoState,
        text: phomemoLabel,
        title: phomemo.connected ? "Verbonden via Bluetooth" : "Klik om de Phomemo via Bluetooth te koppelen",
        onClick: () => {
          if (phomemo.connected) return;
          if (!phomemo.name) {
            void connectPhomemo();
            return;
          }
          setConnecting(true);
          void getPhomemoPrinter()
            .reconnect()
            .then((ok) =>
              ok
                ? notify("success", `Verbonden met ${phomemo.name}`)
                : notify("error", "Opnieuw verbinden mislukt. Zet de printer uit en aan, of kies hem via Instellingen → Koppelen."),
            )
            .finally(() => setConnecting(false));
        },
      }
    : {
        state: printer.state,
        text: printerLabel,
        title: `${printer.message} — klik om opnieuw te controleren`,
        onClick: () => void checkPrinter(true),
      };
  const phomemoFit = (() => {
    const { lengthMm, widthMm } = settings.phomemoLabel;
    const scale = Math.min(lengthMm / 85, widthMm / 62);
    return `${Math.round(85 * scale)} × ${Math.round(62 * scale)} mm`;
  })();
  const setPhomemoLabel = (patch: Partial<PhomemoLabel>) =>
    persistSettings({ ...settings, phomemoLabel: { ...settings.phomemoLabel, ...patch } });

  const sidePanel = (
    <>
      {activePanel === "add" && (
        <div className="panel-body">
          <section className="panel-group">
            <h3>Tekst</h3>
            <div className="tile-grid">
              <button type="button" className="tile" onClick={() => addText("title")}>
                <span className="tile-art tile-art-title">Aa</span>
                <span>Titel</span>
              </button>
              <button type="button" className="tile" onClick={() => addText("body")}>
                <span className="tile-art tile-art-body">Aa</span>
                <span>Tekst</span>
              </button>
              <button type="button" className="tile" onClick={() => addText("date")}>
                <Icon name="calendar" size={26} strokeWidth={1.6} />
                <span>Datum</span>
              </button>
            </div>
          </section>
          <section className="panel-group">
            <h3>Vormen</h3>
            <div className="tile-grid">
              <button type="button" className="tile" onClick={() => addRect("box")}>
                <span className="tile-shape tile-shape-box" />
                <span>Kader</span>
              </button>
              <button type="button" className="tile" onClick={() => addRect("frame")}>
                <span className="tile-shape tile-shape-frame" />
                <span>Rand</span>
              </button>
              <button type="button" className="tile" onClick={() => addLine(false)}>
                <span className="tile-shape tile-shape-line" />
                <span>Lijn</span>
              </button>
              <button type="button" className="tile" onClick={() => addLine(true)}>
                <span className="tile-shape tile-shape-dashed" />
                <span>Stippellijn</span>
              </button>
            </div>
          </section>
          <section className="panel-group">
            <h3>Meer</h3>
            <div className="list-links">
              <button type="button" className="list-link" onClick={() => setPanel("icons")}>
                <Icon name="smile" size={18} />
                <span>
                  <strong>Icons</strong>
                  <small>Medisch, waarschuwing, IT en meer</small>
                </span>
              </button>
              <button type="button" className="list-link" onClick={() => setPanel("templates")}>
                <Icon name="layout" size={18} />
                <span>
                  <strong>Sjablonen</strong>
                  <small>Begin met een kant-en-klaar label</small>
                </span>
              </button>
            </div>
          </section>
        </div>
      )}
      {activePanel === "icons" && <IconsPanel onAdd={(icon) => addIcon(icon)} notify={notify} />}
      {activePanel === "templates" && (
        <TemplatesPanel spec={spec} elements={elements} onApply={applyTemplate} notify={notify} />
      )}
    </>
  );

  const inspector = (
    <Inspector
      spec={spec}
      elements={elements}
      selected={selected}
      textRef={textContentRef}
      onSelect={select}
      onCommit={patchCommit}
      onLive={patchLive}
      onBeginEdit={snapshot}
      onDuplicate={duplicateSelected}
      onDelete={deleteSelected}
      onReorder={reorderSelected}
      onCenter={centerSelected}
    />
  );

  const visiblePanels = PANELS.filter((p) => isCompact || p.id !== "inspect");

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <img src="/favicon.svg" alt="" className="brand-logo" />
          <div className="brand-text">
            <strong>BrotherDruk</strong>
            <span>Label-editor</span>
          </div>
        </div>

        <div className="topbar-group">
          <button
            type="button"
            className="btn btn-icon btn-ghost"
            onClick={undo}
            disabled={!undoRef.current.length}
            title="Ongedaan maken (Ctrl+Z)"
            aria-label="Ongedaan maken"
          >
            <Icon name="undo" />
          </button>
          <button
            type="button"
            className="btn btn-icon btn-ghost"
            onClick={redo}
            disabled={!redoRef.current.length}
            title="Opnieuw (Ctrl+Y)"
            aria-label="Opnieuw"
          >
            <Icon name="redo" />
          </button>
        </div>

        <div className="topbar-actions">
          <button
            type="button"
            className={`printer-pill is-${pill.state}`}
            onClick={pill.onClick}
            title={pill.title}
          >
            <span className="dot" />
            <span className="printer-pill-text">{pill.text}</span>
          </button>
          <button
            type="button"
            className="btn btn-icon btn-ghost"
            title="Instellingen"
            aria-label="Instellingen"
            onClick={() => settingsRef.current?.showModal()}
          >
            <Icon name="settings" />
          </button>
          <button
            type="button"
            className="btn btn-primary btn-print"
            disabled={printing || connecting || elements.length === 0}
            title={elements.length === 0 ? "Voeg eerst iets toe aan het label" : "Afdrukken (Ctrl+P)"}
            onClick={() => void printLabel()}
          >
            <Icon name={printing ? "refresh" : "printer"} className={printing ? "spin" : undefined} />
            <span>{printing ? "Afdrukken…" : "Afdrukken"}</span>
          </button>
        </div>
      </header>

      <div className="workspace">
        <aside className="sidebar">
          <nav className="side-tabs" aria-label="Panelen">
            {visiblePanels.map((p) => (
              <button
                key={p.id}
                type="button"
                className={activePanel === p.id ? "active" : undefined}
                aria-current={activePanel === p.id ? "page" : undefined}
                onClick={() => setPanel(p.id)}
              >
                <Icon name={p.icon} size={20} />
                <span>{p.label}</span>
              </button>
            ))}
          </nav>
          <div className="side-panel">{activePanel === "inspect" ? inspector : sidePanel}</div>
        </aside>

        <main
          className="stage"
          ref={viewportRef}
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes("application/x-brotherdruk-icon")) {
              e.preventDefault();
              e.dataTransfer.dropEffect = "copy";
            }
          }}
          onDrop={(e) => {
            const iconId = e.dataTransfer.getData("application/x-brotherdruk-icon");
            const icon = getAllIcons().find((i) => i.id === iconId);
            if (!icon) return;
            e.preventDefault();
            const rect = canvasWrapRef.current?.getBoundingClientRect();
            const scale = zoom / 100;
            const at = rect
              ? {
                  x: (e.clientX - rect.left - CANVAS_PADDING) / scale,
                  y: (e.clientY - rect.top - CANVAS_PADDING) / scale,
                }
              : undefined;
            addIcon(icon, at);
          }}
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) select(null);
          }}
        >
          <div className="stage-caption">
            <strong>{spec.name}</strong>
            <span>
              {usePhomemo
                ? `Phomemo · afdruk ${phomemoFit} op ${settings.phomemoLabel.lengthMm}×${settings.phomemoLabel.widthMm} mm`
                : "DK-22205 · 62 mm doorlopend"}
            </span>
          </div>
          <div className="stage-canvas" ref={canvasWrapRef}>
            <LabelCanvas
              ref={canvasRef}
              labelSizeId={labelSizeId}
              elements={elements}
              selectedId={selectedId}
              zoom={zoom}
              onSelect={select}
              onChangeElement={patchCommit}
              onRequestTextEdit={(id) => {
                select(id);
                focusText();
              }}
            />
            {elements.length === 0 && (
              <div className="stage-empty">
                <p>Leeg label</p>
                <span>Kies links iets om toe te voegen, of start met een sjabloon.</span>
              </div>
            )}
          </div>

          <div className="stage-toolbar" role="toolbar" aria-label="Weergave">
            <button type="button" className="btn btn-icon btn-ghost btn-sm" onClick={() => stepZoom(-1)} aria-label="Uitzoomen" title="Uitzoomen">
              <Icon name="zoomOut" size={16} />
            </button>
            <button
              type="button"
              className={`btn btn-ghost btn-sm zoom-value${zoomMode === "fit" ? " active" : ""}`}
              onClick={() => setZoomMode("fit")}
              title="Passend maken"
            >
              {zoom}%
            </button>
            <button type="button" className="btn btn-icon btn-ghost btn-sm" onClick={() => stepZoom(1)} aria-label="Inzoomen" title="Inzoomen">
              <Icon name="zoomIn" size={16} />
            </button>
            <span className="toolbar-sep" />
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={elements.length === 0}
              onClick={() => scaleAll(0.9)}
              title="Alles 10% kleiner"
            >
              Alles −
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={elements.length === 0}
              onClick={() => scaleAll(1.1)}
              title="Alles 10% groter"
            >
              Alles +
            </button>
            <span className="toolbar-sep" />
            <button
              type="button"
              className="btn btn-ghost btn-sm btn-danger-ghost"
              disabled={elements.length === 0}
              onClick={clearCanvas}
              title="Label leegmaken"
            >
              <Icon name="eraser" size={16} />
              <span className="hide-sm">Wissen</span>
            </button>
          </div>
        </main>

        {!isCompact && <aside className="inspector">{inspector}</aside>}
      </div>

      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.kind}`}>
            <Icon name={t.kind === "error" ? "alert" : t.kind === "success" ? "check" : "info"} size={18} />
            <span className="toast-msg">{t.message}</span>
            {t.action && (
              <button
                type="button"
                className="toast-action"
                onClick={() => {
                  t.action?.run();
                  dismissToast(t.id);
                }}
              >
                {t.action.label}
              </button>
            )}
            <button type="button" className="toast-close" aria-label="Sluiten" onClick={() => dismissToast(t.id)}>
              <Icon name="x" size={14} />
            </button>
          </div>
        ))}
      </div>

      <dialog
        ref={settingsRef}
        className="dialog"
        onClick={(e) => {
          if (e.target === e.currentTarget) e.currentTarget.close();
        }}
      >
        <div className="dialog-body">
          <div className="dialog-head">
            <h2>Instellingen</h2>
            <button
              type="button"
              className="btn btn-icon btn-ghost"
              aria-label="Sluiten"
              onClick={() => settingsRef.current?.close()}
            >
              <Icon name="x" />
            </button>
          </div>

          <section className="panel-group">
            <h3>Printer</h3>
            <div className="segmented" role="radiogroup" aria-label="Printer kiezen">
              {(
                [
                  ["brother", "Brother (netwerk)"],
                  ["phomemo", "Phomemo (Bluetooth)"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={settings.printer === id}
                  className={settings.printer === id ? "active" : undefined}
                  onClick={() => persistSettings({ ...settings, printer: id })}
                >
                  {label}
                </button>
              ))}
            </div>

            {!usePhomemo ? (
              <>
                <div className={`printer-card is-${printer.state}`}>
                  <span className="dot" />
                  <div>
                    <strong>{printerLabel}</strong>
                    <p>{printer.message}</p>
                  </div>
                  <button type="button" className="btn btn-sm" onClick={() => void checkPrinter(true)}>
                    <Icon name="refresh" size={15} className={printer.state === "checking" ? "spin" : undefined} />
                    Controleren
                  </button>
                </div>
                <p className="hint">
                  Brother QL-820NWB met rol DK-22205 (62 mm). Het printeradres staat op de server
                  (PRINTER_HOST).
                </p>
              </>
            ) : (
              <>
                <div className={`printer-card is-${phomemoState}`}>
                  <span className="dot" />
                  <div>
                    <strong>{phomemoLabel}</strong>
                    <p>
                      {phomemo.connected
                        ? "Verbonden via Bluetooth"
                        : phomemo.name
                          ? `Laatst gebruikt: ${phomemo.name}`
                          : "Nog geen printer gekoppeld"}
                    </p>
                  </div>
                  {phomemo.name && (
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost"
                      onClick={() => getPhomemoPrinter().forget()}
                    >
                      Vergeten
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-sm"
                    disabled={connecting}
                    onClick={() => void connectPhomemo()}
                  >
                    <Icon name="refresh" size={15} className={connecting ? "spin" : undefined} />
                    {phomemo.connected ? "Andere" : "Koppelen"}
                  </button>
                </div>
                <div className="mm-grid">
                  <label className="field">
                    <span className="field-label">Labellengte (mm)</span>
                    <input
                      className="input"
                      type="number"
                      min={10}
                      max={300}
                      value={settings.phomemoLabel.lengthMm}
                      onChange={(e) => setPhomemoLabel({ lengthMm: Number(e.target.value) || 0 })}
                      onBlur={() =>
                        setPhomemoLabel({ lengthMm: validMm(settings.phomemoLabel.lengthMm, DEFAULT_PHOMEMO_LABEL.lengthMm) })
                      }
                    />
                  </label>
                  <label className="field">
                    <span className="field-label">Bedrukbare breedte (mm)</span>
                    <input
                      className="input"
                      type="number"
                      min={10}
                      max={300}
                      value={settings.phomemoLabel.widthMm}
                      onChange={(e) => setPhomemoLabel({ widthMm: Number(e.target.value) || 0 })}
                      onBlur={() =>
                        setPhomemoLabel({ widthMm: validMm(settings.phomemoLabel.widthMm, DEFAULT_PHOMEMO_LABEL.widthMm) })
                      }
                    />
                  </label>
                </div>
                <p className="hint">
                  Phomemo M110 via Bluetooth, rechtstreeks vanuit de browser (Chrome of Edge; niet op iPhone/Safari).
                  Het ontwerp van 85 × 62 mm wordt passend geschaald: afdruk {phomemoFit}.
                </p>
              </>
            )}
          </section>

          <section className="panel-group">
            <h3>Beveiliging</h3>
            <label className="field">
              <span className="field-label">API-sleutel (optioneel)</span>
              <input
                className="input"
                type="password"
                autoComplete="off"
                value={settings.apiKey}
                onChange={(e) => persistSettings({ ...settings, apiKey: e.target.value })}
                placeholder="Alleen nodig als API_KEY op de server staat"
              />
            </label>
          </section>
        </div>
      </dialog>
    </div>
  );
}

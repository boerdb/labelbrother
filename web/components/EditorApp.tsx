"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { v4 as uuid } from "uuid";
import dynamic from "next/dynamic";
import type { LabelCanvasHandle } from "@/components/LabelCanvas";

const LabelCanvas = dynamic(() => import("@/components/LabelCanvas"), { ssr: false });
import type { EditorElement, TextElement } from "@/lib/editorTypes";
import { ICON_PACKS, getIconPack } from "@/lib/iconPacks";
import {
  ICON_CATEGORY_LABELS,
  ICON_LIBRARY,
  getAllIcons,
  getExtraIcons,
  registerExtraIcons,
  unregisterPackIcons,
  type IconCategory,
} from "@/lib/icons";
import { LABEL_SIZES, type LabelSizeId } from "@/lib/labelSizes";
import { reidElements } from "@/lib/reidElements";
import { scaleElements } from "@/lib/scaleElements";
import { BUILTIN_TEMPLATES } from "@/lib/templates";
import {
  deleteIconPack,
  deleteTemplate,
  listSavedIconPacks,
  listSavedTemplates,
  saveIconPack,
  saveTemplate,
  type SavedTemplate,
} from "@/lib/storage";

const SETTINGS_KEY = "brotherdruk-settings";
const ICON_SIZE = 96;

interface AppSettings {
  apiKey: string;
}

type LibraryTab = "templates" | "icons" | "shapes";
type IconFilter = "all" | IconCategory;

function loadSettings(): AppSettings {
  if (typeof window === "undefined") return { apiKey: "" };
  try {
    const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}") as Partial<AppSettings>;
    return { apiKey: typeof raw.apiKey === "string" ? raw.apiKey : "" };
  } catch {
    return { apiKey: "" };
  }
}

function cloneElements(elements: EditorElement[]): EditorElement[] {
  return structuredClone(elements);
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

export default function EditorApp() {
  const canvasRef = useRef<LabelCanvasHandle>(null);
  const textContentRef = useRef<HTMLTextAreaElement>(null);
  const [labelSizeId] = useState<LabelSizeId>("85x62");
  const [elements, setElements] = useState<EditorElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(42);
  const [undoStack, setUndoStack] = useState<EditorElement[][]>([]);
  const [redoStack, setRedoStack] = useState<EditorElement[][]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);
  const [library, setLibrary] = useState<LibraryTab>("templates");
  const [savedTemplates, setSavedTemplates] = useState<SavedTemplate[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ apiKey: "" });
  const [saveName, setSaveName] = useState("Mijn sjabloon");
  const [templateScale, setTemplateScale] = useState(100);
  const [iconQuery, setIconQuery] = useState("");
  const [iconFilter, setIconFilter] = useState<IconFilter>("medisch");
  const [iconPackId, setIconPackId] = useState("builtin");
  const [downloadedPacks, setDownloadedPacks] = useState<string[]>([]);
  const [iconPackTick, setIconPackTick] = useState(0);
  const [iconBusy, setIconBusy] = useState(false);

  const selected = useMemo(
    () => elements.find((e) => e.id === selectedId) ?? null,
    [elements, selectedId],
  );

  const filteredIcons = useMemo(() => {
    const q = iconQuery.trim().toLowerCase();
    const source = iconPackId === "builtin" ? ICON_LIBRARY : getExtraIcons(iconPackId);
    return source.filter((icon) => {
      if (iconFilter !== "all" && icon.category !== iconFilter) return false;
      if (!q) return true;
      return icon.label.toLowerCase().includes(q) || icon.id.includes(q);
    });
  }, [iconQuery, iconFilter, iconPackId, iconPackTick]);

  useEffect(() => {
    setSettings(loadSettings());
    void listSavedTemplates().then(setSavedTemplates);
    void listSavedIconPacks().then((packs) => {
      for (const pack of packs) registerExtraIcons(pack.icons);
      setDownloadedPacks(packs.map((pack) => pack.id));
      setIconPackTick((n) => n + 1);
    });
  }, []);

  const requestTextEdit = (id: string) => {
    setSelectedId(id);
    window.setTimeout(() => textContentRef.current?.focus(), 0);
  };

  const pushHistory = useCallback((next: EditorElement[]) => {
    setUndoStack((prev) => [...prev.slice(-30), cloneElements(elements)]);
    setRedoStack([]);
    setElements(next);
  }, [elements]);

  const undo = useCallback(() => {
    const prev = undoStack.at(-1);
    if (!prev) return;
    setRedoStack((r) => [...r, cloneElements(elements)]);
    setElements(prev);
    setUndoStack((u) => u.slice(0, -1));
  }, [elements, undoStack]);

  const redo = useCallback(() => {
    const next = redoStack.at(-1);
    if (!next) return;
    setUndoStack((u) => [...u, cloneElements(elements)]);
    setElements(next);
    setRedoStack((r) => r.slice(0, -1));
  }, [elements, redoStack]);

  const updateElement = (id: string, patch: Partial<EditorElement>) => {
    setElements((curr) =>
      curr.map((el) => (el.id === id ? ({ ...el, ...patch } as EditorElement) : el)),
    );
  };

  const labelCenter = () => {
    const s = LABEL_SIZES[labelSizeId];
    return { x: s.width / 2, y: s.height / 2 };
  };

  const addText = () => {
    const spec = LABEL_SIZES[labelSizeId];
    const { y } = labelCenter();
    const el: TextElement = {
      id: uuid(),
      type: "text",
      x: 40,
      y: y - 28,
      text: "Nieuwe tekst",
      fontSize: 56,
      fontStyle: "normal",
      fill: "#000000",
      width: spec.width - 80,
      align: "center",
    };
    pushHistory([...elements, el]);
    setSelectedId(el.id);
    window.setTimeout(() => textContentRef.current?.focus(), 0);
  };

  const addRect = () => {
    const { x, y } = labelCenter();
    const width = 240;
    const height = 140;
    pushHistory([
      ...elements,
      {
        id: uuid(),
        type: "rect",
        x: x - width / 2,
        y: y - height / 2,
        width,
        height,
        stroke: "#000000",
        strokeWidth: 3,
      },
    ]);
  };

  const addLine = () => {
    const spec = LABEL_SIZES[labelSizeId];
    const { y } = labelCenter();
    pushHistory([
      ...elements,
      {
        id: uuid(),
        type: "line",
        x: 0,
        y: 0,
        points: [40, y, spec.width - 40, y],
        stroke: "#000000",
        strokeWidth: 3,
      },
    ]);
  };

  const downloadIconPack = async (packId: string) => {
    setIconBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/icons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        icons?: import("@/lib/icons").IconDef[];
      };
      if (!res.ok || !data.ok || !data.icons?.length) {
        throw new Error(data.error ?? "Download mislukt");
      }
      registerExtraIcons(data.icons);
      await saveIconPack({ id: packId, icons: data.icons, updatedAt: Date.now() });
      setDownloadedPacks((prev) => [...new Set([...prev, packId])]);
      setIconPackTick((n) => n + 1);
      setStatus(`${data.icons.length} figuurtjes geladen`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download mislukt");
    } finally {
      setIconBusy(false);
    }
  };

  const removeIconPack = async (packId: string) => {
    unregisterPackIcons(packId);
    await deleteIconPack(packId);
    setDownloadedPacks((prev) => prev.filter((id) => id !== packId));
    setIconPackTick((n) => n + 1);
    if (iconPackId === packId) setIconPackId("builtin");
    setStatus("Set verwijderd van dit apparaat");
  };

  const selectIconPack = (packId: string) => {
    setIconPackId(packId);
    setIconFilter(packId === "builtin" ? "medisch" : "all");
    const pack = getIconPack(packId);
    if (pack && !pack.builtin && !downloadedPacks.includes(packId)) {
      void downloadIconPack(packId);
    }
  };

  const addIcon = (iconId: string) => {
    const { x, y } = labelCenter();
    const id = uuid();
    pushHistory([
      ...elements,
      {
        id,
        type: "icon",
        x: x - ICON_SIZE / 2,
        y: y - ICON_SIZE / 2,
        iconId,
        width: ICON_SIZE,
        height: ICON_SIZE,
      },
    ]);
    setSelectedId(id);
  };

  const applyTemplate = (templateElements: EditorElement[]) => {
    const { x, y } = labelCenter();
    const factor = templateScale / 100;
    let scaled =
      factor === 1
        ? cloneElements(templateElements)
        : scaleElements(cloneElements(templateElements), factor, x, y);
    scaled = reidElements(scaled);
    pushHistory(scaled);
    setSelectedId(null);
  };

  const scaleAllElements = (factor: number) => {
    if (elements.length === 0) return;
    const { x, y } = labelCenter();
    pushHistory(scaleElements(elements, factor, x, y));
  };

  const scaleSelected = (factor: number) => {
    if (!selectedId) return;
    const { x, y } = labelCenter();
    pushHistory(
      elements.map((el) => {
        if (el.id !== selectedId) return el;
        return scaleElements([el], factor, x, y)[0]!;
      }),
    );
  };

  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    pushHistory(elements.filter((e) => e.id !== selectedId));
    setSelectedId(null);
  }, [elements, pushHistory, selectedId]);

  const duplicateSelected = useCallback(() => {
    if (!selected) return;
    const copy = structuredClone(selected);
    copy.id = uuid();
    copy.x += 24;
    copy.y += 24;
    pushHistory([...elements, copy]);
    setSelectedId(copy.id);
  }, [elements, pushHistory, selected]);

  const alignSelectedText = (align: TextElement["align"]) => {
    if (!selected || selected.type !== "text") return;
    updateElement(selected.id, { align });
  };

  const apiHeaders = (): HeadersInit => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const apiKey = settings.apiKey?.trim() ?? "";
    if (apiKey) {
      headers["X-API-Key"] = apiKey;
    }
    return headers;
  };

  const checkStatus = async () => {
    setError(null);
    setStatus("Printerstatus ophalen…");
    try {
      const res = await fetch("/api/status", {
        headers: apiHeaders(),
        signal: AbortSignal.timeout(15000),
      });
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        message?: string;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? data.message ?? "Status mislukt");
      }
      setStatus(data.message ?? "Printer bereikbaar");
    } catch (e) {
      setStatus(null);
      setError(e instanceof Error ? e.message : "Status mislukt");
    }
  };

  const printLabel = async () => {
    setPrinting(true);
    setError(null);
    setStatus("Bezig met afdrukken…");
    try {
      const image = await canvasRef.current?.exportPng();
      if (!image) {
        throw new Error("Kon label niet exporteren");
      }
      const res = await fetch("/api/print", {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify({ labelSize: labelSizeId, image }),
        signal: AbortSignal.timeout(120_000),
      });
      let data: { ok?: boolean; error?: string; jobId?: string; async?: boolean };
      try {
        data = (await res.json()) as typeof data;
      } catch {
        throw new Error(`Server antwoordde niet (${res.status}). Draait de app op dezelfde URL?`);
      }
      if (!res.ok || !data.ok || !data.jobId) {
        throw new Error(data.error ?? `Afdrukken mislukt (HTTP ${res.status})`);
      }

      const jobId = data.jobId;
      const pollDeadline = Date.now() + 120_000;
      while (Date.now() < pollDeadline) {
        setStatus("Label naar printer…");
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
        if (!poll.ok || !pollData.ok) {
          throw new Error(pollData.error ?? "Printstatus onbekend");
        }
        if (pollData.status === "done") {
          setStatus(`Label verzonden (${jobId.slice(0, 8)})`);
          return;
        }
        if (pollData.status === "error") {
          throw new Error(pollData.error ?? "Print mislukt op de server");
        }
      }
      throw new Error("Print duurde te lang — controleer de printer");
    } catch (e) {
      if (e instanceof DOMException && e.name === "TimeoutError") {
        setError("Verbinding time-out (vaak op iOS). Probeer opnieuw of ververs de pagina.");
      } else {
        setError(e instanceof Error ? e.message : "Afdrukken mislukt");
      }
      setStatus(null);
    } finally {
      setPrinting(false);
    }
  };

  const persistSettings = (next: AppSettings) => {
    setSettings(next);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  };

  const saveCurrentTemplate = async () => {
    const entry: SavedTemplate = {
      id: uuid(),
      name: saveName.trim() || "Sjabloon",
      document: { labelSizeId, elements: cloneElements(elements) },
      updatedAt: Date.now(),
    };
    await saveTemplate(entry);
    setSavedTemplates(await listSavedTemplates());
    setStatus(`Sjabloon opgeslagen: ${entry.name}`);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
        return;
      }
      if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        duplicateSelected();
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteSelected();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deleteSelected, duplicateSelected, redo, undo]);

  const spec = LABEL_SIZES[labelSizeId];
  if (!spec) {
    return (
      <div className="app-shell" style={{ padding: "2rem" }}>
        <p>Onbekend labelformaat: {labelSizeId}</p>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="top-bar">
        <div className="brand">
          <span className="brand-mark">BD</span>
          <div>
            <h1>BrotherDruk</h1>
            <p className="brand-meta">{spec.name} · DK-22205</p>
          </div>
        </div>
        <div className="top-actions">
          <button type="button" className="btn" onClick={undo} disabled={!undoStack.length}>
            Ongedaan
          </button>
          <button type="button" className="btn" onClick={redo} disabled={!redoStack.length}>
            Opnieuw
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => void checkStatus()}>
            Printer
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={printing}
            onClick={() => void printLabel()}
          >
            {printing ? "Bezig…" : "Druk af"}
          </button>
        </div>
      </header>

      {(status || error) && (
        <div className={`status-banner${error ? " error" : ""}`}>{error ?? status}</div>
      )}

      <div className="main-area">
        <aside className="library-panel">
          <nav className="rail-tabs" aria-label="Bibliotheek">
            <button
              type="button"
              className={`btn${library === "templates" ? " active" : ""}`}
              onClick={() => setLibrary("templates")}
            >
              Sjablonen
            </button>
            <button
              type="button"
              className={`btn${library === "icons" ? " active" : ""}`}
              onClick={() => setLibrary("icons")}
            >
              Figuurtjes
            </button>
            <button
              type="button"
              className={`btn${library === "shapes" ? " active" : ""}`}
              onClick={() => setLibrary("shapes")}
            >
              Vormen
            </button>
          </nav>

          {library === "templates" && (
            <div className="panel-section">
              <h2>Startpunt</h2>
              <div className="field">
                <label htmlFor="template-scale">Grootte bij laden: {templateScale}%</label>
                <input
                  id="template-scale"
                  type="range"
                  min={80}
                  max={200}
                  step={5}
                  value={templateScale}
                  onChange={(e) => setTemplateScale(parseInt(e.target.value, 10))}
                />
              </div>
              <div className="template-list">
                {BUILTIN_TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className="template-card"
                    onClick={() => applyTemplate(t.elements)}
                  >
                    <strong>{t.name}</strong>
                    <span>{t.description}</span>
                  </button>
                ))}
              </div>
              <h2 style={{ marginTop: "1.15rem" }}>Opgeslagen</h2>
              <div className="field">
                <label htmlFor="save-name">Naam</label>
                <input
                  id="save-name"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                />
              </div>
              <button type="button" className="btn btn-primary" onClick={() => void saveCurrentTemplate()}>
                Huidig label opslaan
              </button>
              <div className="template-list" style={{ marginTop: "0.75rem" }}>
                {savedTemplates.map((t) => (
                  <div key={t.id} className="saved-row">
                    <button
                      type="button"
                      className="template-card"
                      style={{ flex: 1 }}
                      onClick={() => applyTemplate(t.document.elements)}
                    >
                      <strong>{t.name}</strong>
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger"
                      aria-label="Verwijderen"
                      onClick={() =>
                        void deleteTemplate(t.id).then(async () =>
                          setSavedTemplates(await listSavedTemplates()),
                        )
                      }
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {library === "icons" && (
            <div className="panel-section">
              <h2>Figuurtjes</h2>
              <div className="field">
                <label htmlFor="icon-pack">Set</label>
                <select
                  id="icon-pack"
                  value={iconPackId}
                  onChange={(e) => selectIconPack(e.target.value)}
                >
                  {ICON_PACKS.map((pack) => {
                    const ready = pack.builtin || downloadedPacks.includes(pack.id);
                    return (
                      <option key={pack.id} value={pack.id}>
                        {pack.name}
                        {ready ? "" : " — download"}
                      </option>
                    );
                  })}
                </select>
              </div>
              <p className="hint" style={{ marginTop: "-0.35rem" }}>
                {getIconPack(iconPackId)?.description}
                {getIconPack(iconPackId)?.builtin
                  ? ""
                  : ` · ${getIconPack(iconPackId)?.license}`}
              </p>
              {!getIconPack(iconPackId)?.builtin && (
                <div className="btn-row" style={{ marginBottom: "0.75rem" }}>
                  <button
                    type="button"
                    className="btn"
                    disabled={iconBusy}
                    onClick={() => void downloadIconPack(iconPackId)}
                  >
                    {iconBusy
                      ? "Downloaden…"
                      : downloadedPacks.includes(iconPackId)
                        ? "Opnieuw downloaden"
                        : "Set downloaden"}
                  </button>
                  {downloadedPacks.includes(iconPackId) && (
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => void removeIconPack(iconPackId)}
                    >
                      Verwijder set
                    </button>
                  )}
                </div>
              )}
              <div className="field">
                <label htmlFor="icon-search">Zoeken</label>
                <input
                  id="icon-search"
                  value={iconQuery}
                  onChange={(e) => setIconQuery(e.target.value)}
                  placeholder="bijv. infuus, hart, koel"
                />
              </div>
              <div className="chip-row">
                {(Object.keys(ICON_CATEGORY_LABELS) as IconFilter[]).map((id) => (
                  <button
                    key={id}
                    type="button"
                    className={`chip${iconFilter === id ? " active" : ""}`}
                    onClick={() => setIconFilter(id)}
                  >
                    {ICON_CATEGORY_LABELS[id]}
                  </button>
                ))}
              </div>
              <p className="hint" style={{ marginTop: 0 }}>
                Klik om in het midden te plaatsen. {filteredIcons.length} figuurtjes.
              </p>
              <div className="icon-grid">
                {filteredIcons.map((icon) => (
                  <button
                    key={icon.id}
                    type="button"
                    className="icon-btn"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", icon.id);
                      e.dataTransfer.effectAllowed = "copy";
                    }}
                    onClick={() => addIcon(icon.id)}
                  >
                    <img src={icon.src} alt="" />
                    <span>{icon.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {library === "shapes" && (
            <div className="panel-section">
              <h2>Toevoegen</h2>
              <div className="shape-list">
                <button type="button" className="template-card" onClick={addText}>
                  <strong>Tekst</strong>
                  <span>Titel, dosis of toelichting</span>
                </button>
                <button type="button" className="template-card" onClick={addRect}>
                  <strong>Rechthoek</strong>
                  <span>Kader of vak</span>
                </button>
                <button type="button" className="template-card" onClick={addLine}>
                  <strong>Lijn</strong>
                  <span>Scheiding over de breedte</span>
                </button>
              </div>
            </div>
          )}
        </aside>

        <section
          className="canvas-panel"
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
          }}
          onDrop={(e) => {
            e.preventDefault();
            const iconId = e.dataTransfer.getData("text/plain");
            if (getAllIcons().some((icon) => icon.id === iconId)) {
              addIcon(iconId);
            }
          }}
        >
          <LabelCanvas
            ref={canvasRef}
            labelSizeId={labelSizeId}
            elements={elements}
            selectedId={selectedId}
            zoom={zoom}
            onSelect={setSelectedId}
            onChangeElement={updateElement}
            onRequestTextEdit={requestTextEdit}
          />
          <div className="canvas-tools">
            <label>
              Zoom
              <input
                type="range"
                min={30}
                max={120}
                value={zoom}
                onChange={(e) => setZoom(parseInt(e.target.value, 10))}
              />
              {zoom}%
            </label>
            <button
              type="button"
              className="btn"
              disabled={elements.length === 0}
              onClick={() => scaleAllElements(1.1)}
            >
              Alles +
            </button>
            <button
              type="button"
              className="btn"
              disabled={elements.length === 0}
              onClick={() => scaleAllElements(0.9)}
            >
              Alles −
            </button>
          </div>
        </section>

        <aside className="inspector-panel">
          <div className="panel-section">
            <h2>Eigenschappen</h2>
            {!selected && (
              <p className="hint">
                Selecteer een element op het label. Dubbelklik op tekst om te bewerken. Delete verwijdert,
                Ctrl+D dupliceert.
              </p>
            )}
            {selected?.type === "text" && (
              <>
                <div className="field">
                  <label htmlFor="text-content">Tekst</label>
                  <textarea
                    ref={textContentRef}
                    id="text-content"
                    rows={3}
                    value={selected.text}
                    onChange={(e) => updateElement(selected.id, { text: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label htmlFor="text-size">Lettergrootte ({selected.fontSize})</label>
                  <div className="btn-row" style={{ alignItems: "center" }}>
                    <button
                      type="button"
                      className="btn"
                      onClick={() =>
                        updateElement(selected.id, {
                          fontSize: Math.max(8, selected.fontSize - 8),
                        })
                      }
                    >
                      A−
                    </button>
                    <input
                      id="text-size"
                      type="range"
                      min={16}
                      max={200}
                      step={2}
                      value={selected.fontSize}
                      style={{ flex: 1 }}
                      onChange={(e) =>
                        updateElement(selected.id, {
                          fontSize: parseInt(e.target.value, 10) || 16,
                        })
                      }
                    />
                    <button
                      type="button"
                      className="btn"
                      onClick={() =>
                        updateElement(selected.id, {
                          fontSize: Math.min(200, selected.fontSize + 8),
                        })
                      }
                    >
                      A+
                    </button>
                  </div>
                </div>
                <div className="field">
                  <label>Stijl</label>
                  <div className="btn-row">
                    <button
                      type="button"
                      className={`btn${selected.fontStyle === "normal" ? " active" : ""}`}
                      onClick={() => updateElement(selected.id, { fontStyle: "normal" })}
                    >
                      Normaal
                    </button>
                    <button
                      type="button"
                      className={`btn${selected.fontStyle === "bold" ? " active" : ""}`}
                      onClick={() => updateElement(selected.id, { fontStyle: "bold" })}
                    >
                      Vet
                    </button>
                  </div>
                </div>
                <div className="field">
                  <label>Uitlijning</label>
                  <div className="btn-row">
                    <button
                      type="button"
                      className={`btn${selected.align === "left" ? " active" : ""}`}
                      onClick={() => alignSelectedText("left")}
                    >
                      Links
                    </button>
                    <button
                      type="button"
                      className={`btn${selected.align === "center" ? " active" : ""}`}
                      onClick={() => alignSelectedText("center")}
                    >
                      Midden
                    </button>
                    <button
                      type="button"
                      className={`btn${selected.align === "right" ? " active" : ""}`}
                      onClick={() => alignSelectedText("right")}
                    >
                      Rechts
                    </button>
                  </div>
                </div>
              </>
            )}
            {selected && (
              <div className="btn-row">
                <button type="button" className="btn" onClick={() => scaleSelected(1.1)}>
                  Groter
                </button>
                <button type="button" className="btn" onClick={() => scaleSelected(0.9)}>
                  Kleiner
                </button>
                <button type="button" className="btn" onClick={duplicateSelected}>
                  Dupliceer
                </button>
                <button type="button" className="btn btn-danger" onClick={deleteSelected}>
                  Verwijder
                </button>
              </div>
            )}
          </div>

          <details className="settings-block">
            <summary>Instellingen</summary>
            <div className="field" style={{ marginTop: "0.75rem" }}>
              <label htmlFor="api-key">API-sleutel (optioneel)</label>
              <input
                id="api-key"
                type="password"
                value={settings.apiKey ?? ""}
                onChange={(e) => persistSettings({ ...settings, apiKey: e.target.value })}
                placeholder="Alleen nodig als API_KEY in Docker staat"
              />
            </div>
            <p className="hint">
              Standaard praat de app met dezelfde Next.js-server op dit apparaat. Printer:{" "}
              {process.env.NEXT_PUBLIC_PRINTER_HINT ?? "via server PRINTER_HOST"}.
            </p>
          </details>
        </aside>
      </div>
    </div>
  );
}

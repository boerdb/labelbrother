"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { v4 as uuid } from "uuid";
import dynamic from "next/dynamic";
import type { LabelCanvasHandle } from "@/components/LabelCanvas";

const LabelCanvas = dynamic(() => import("@/components/LabelCanvas"), { ssr: false });
import type { EditorElement, TextElement } from "@/lib/editorTypes";
import { ICON_LIBRARY } from "@/lib/icons";
import { LABEL_SIZES, type LabelSizeId } from "@/lib/labelSizes";
import { reidElements } from "@/lib/reidElements";
import { scaleElements } from "@/lib/scaleElements";
import { BUILTIN_TEMPLATES } from "@/lib/templates";
import {
  deleteTemplate,
  listSavedTemplates,
  saveTemplate,
  type SavedTemplate,
} from "@/lib/storage";

const SETTINGS_KEY = "brotherdruk-settings";

interface AppSettings {
  apiKey: string;
}

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
  const [panel, setPanel] = useState<"props" | "templates" | "icons" | "settings">("templates");
  const [savedTemplates, setSavedTemplates] = useState<SavedTemplate[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ apiKey: "" });
  const [saveName, setSaveName] = useState("Mijn sjabloon");
  /** Schaal voor nieuw ingeladen sjablonen (100 = ontwerpgrootte). */
  const [templateScale, setTemplateScale] = useState(130);

  const selected = useMemo(
    () => elements.find((e) => e.id === selectedId) ?? null,
    [elements, selectedId],
  );

  useEffect(() => {
    setSettings(loadSettings());
    void listSavedTemplates().then(setSavedTemplates);
  }, []);

  useEffect(() => {
    if (selected?.type === "text") {
      setPanel("props");
    }
  }, [selectedId, selected?.type]);

  const requestTextEdit = (id: string) => {
    setSelectedId(id);
    setPanel("props");
    window.setTimeout(() => textContentRef.current?.focus(), 0);
  };

  const pushHistory = useCallback((next: EditorElement[]) => {
    setUndoStack((prev) => [...prev.slice(-30), cloneElements(elements)]);
    setRedoStack([]);
    setElements(next);
  }, [elements]);

  const undo = () => {
    const prev = undoStack.at(-1);
    if (!prev) return;
    setRedoStack((r) => [...r, cloneElements(elements)]);
    setElements(prev);
    setUndoStack((u) => u.slice(0, -1));
  };

  const redo = () => {
    const next = redoStack.at(-1);
    if (!next) return;
    setUndoStack((u) => [...u, cloneElements(elements)]);
    setElements(next);
    setRedoStack((r) => r.slice(0, -1));
  };

  const updateElement = (id: string, patch: Partial<EditorElement>) => {
    setElements((curr) =>
      curr.map((el) => (el.id === id ? ({ ...el, ...patch } as EditorElement) : el)),
    );
  };

  const addText = () => {
    const el: TextElement = {
      id: uuid(),
      type: "text",
      x: 30,
      y: 200,
      text: "Nieuwe tekst",
      fontSize: 56,
      fontStyle: "normal",
      fill: "#000000",
      width: 874,
      align: "left",
    };
    pushHistory([...elements, el]);
    setSelectedId(el.id);
    setPanel("props");
  };

  const addRect = () => {
    pushHistory([
      ...elements,
      {
        id: uuid(),
        type: "rect",
        x: 40,
        y: 300,
        width: 220,
        height: 120,
        stroke: "#000000",
        strokeWidth: 3,
      },
    ]);
  };

  const addLine = () => {
    pushHistory([
      ...elements,
      {
        id: uuid(),
        type: "line",
        x: 0,
        y: 0,
        points: [30, 500, 276, 500],
        stroke: "#000000",
        strokeWidth: 3,
      },
    ]);
  };

  const addIcon = (iconId: string) => {
    pushHistory([
      ...elements,
      {
        id: uuid(),
        type: "icon",
        x: 100,
        y: 200,
        iconId,
        width: 80,
        height: 80,
      },
    ]);
  };

  const labelCenter = () => {
    const s = LABEL_SIZES[labelSizeId];
    return { x: s.width / 2, y: s.height / 2 };
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

  const deleteSelected = () => {
    if (!selectedId) return;
    pushHistory(elements.filter((e) => e.id !== selectedId));
    setSelectedId(null);
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
      });
      let data: { ok?: boolean; error?: string; jobId?: string };
      try {
        data = (await res.json()) as { ok: boolean; error?: string; jobId?: string };
      } catch {
        throw new Error(`Server antwoordde niet (${res.status}). Draait de app op dezelfde URL?`);
      }
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? `Afdrukken mislukt (HTTP ${res.status})`);
      }
      setStatus(`Label verzonden (${data.jobId?.slice(0, 8) ?? "ok"})`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Afdrukken mislukt");
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
        <h1>BrotherDruk</h1>
        <div className="top-controls">
          <label>
            Formaat{" "}
            <select value={labelSizeId} disabled>
              <option value={labelSizeId}>{spec.name}</option>
            </select>
          </label>
          <label>
            Zoom{" "}
            <input
              type="range"
              min={30}
              max={120}
              value={zoom}
              onChange={(e) => setZoom(parseInt(e.target.value, 10))}
            />
            {zoom}%
          </label>
          <button type="button" className="btn" onClick={undo} disabled={!undoStack.length}>
            Ongedaan
          </button>
          <button type="button" className="btn" onClick={redo} disabled={!redoStack.length}>
            Opnieuw
          </button>
          <button type="button" className="btn" onClick={() => void checkStatus()}>
            Status
          </button>
        </div>
      </header>

      {(status || error) && (
        <div className={`status-banner${error ? " error" : ""}`}>{error ?? status}</div>
      )}

      <div className="main-area">
        <section className="canvas-panel">
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
        </section>

        <aside className="side-panel">
          <div className="panel-section">
            <button
              type="button"
              className={`btn${panel === "templates" ? " active" : ""}`}
              onClick={() => setPanel("templates")}
            >
              Sjablonen
            </button>{" "}
            <button
              type="button"
              className={`btn${panel === "icons" ? " active" : ""}`}
              onClick={() => setPanel("icons")}
            >
              Figuurtjes
            </button>{" "}
            <button
              type="button"
              className={`btn${panel === "props" ? " active" : ""}`}
              onClick={() => setPanel("props")}
            >
              Eigenschappen
            </button>{" "}
            <button
              type="button"
              className={`btn${panel === "settings" ? " active" : ""}`}
              onClick={() => setPanel("settings")}
            >
              Instellingen
            </button>
          </div>

          {panel === "templates" && (
            <div className="panel-section">
              <h2>Sjablonen</h2>
              <div className="field">
                <label htmlFor="template-scale">
                  Sjabloongrootte bij laden: {templateScale}%
                </label>
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
                    className="btn"
                    onClick={() => applyTemplate(t.elements)}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
              <h2>Opgeslagen</h2>
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
                  <div key={t.id} style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      type="button"
                      className="btn"
                      style={{ flex: 1 }}
                      onClick={() => applyTemplate(t.document.elements)}
                    >
                      {t.name}
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger"
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

          {panel === "icons" && (
            <div className="panel-section">
              <h2>Figuurtjes</h2>
              <div className="icon-grid">
                {ICON_LIBRARY.map((icon) => (
                  <button
                    key={icon.id}
                    type="button"
                    className="icon-btn"
                    onClick={() => addIcon(icon.id)}
                  >
                    <img src={icon.src} alt="" />
                    <span>{icon.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {panel === "props" && (
            <div className="panel-section">
              <h2>Eigenschappen</h2>
              {!selected && <p style={{ color: "var(--muted)" }}>Selecteer een element op het label.</p>}
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
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
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
                    <label htmlFor="text-align">Uitlijning</label>
                    <select
                      id="text-align"
                      value={selected.align}
                      onChange={(e) =>
                        updateElement(selected.id, {
                          align: e.target.value as TextElement["align"],
                        })
                      }
                    >
                      <option value="left">Links</option>
                      <option value="center">Midden</option>
                      <option value="right">Rechts</option>
                    </select>
                  </div>
                </>
              )}
              {selected && (
                <>
                  <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
                    <button type="button" className="btn" onClick={() => scaleSelected(1.1)}>
                      Element groter
                    </button>
                    <button type="button" className="btn" onClick={() => scaleSelected(0.9)}>
                      Element kleiner
                    </button>
                  </div>
                  <button type="button" className="btn btn-danger" onClick={deleteSelected}>
                    Element verwijderen
                  </button>
                </>
              )}
              {!selected && elements.length > 0 && (
                <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
                  Tip: gebruik in de werkbalk &quot;Alles groter&quot; / &quot;Alles kleiner&quot; voor het
                  hele label.
                </p>
              )}
            </div>
          )}

          {panel === "settings" && (
            <div className="panel-section">
              <h2>Instellingen</h2>
              <div className="field">
                <label htmlFor="api-key">API-sleutel (optioneel)</label>
                <input
                  id="api-key"
                  type="password"
                  value={settings.apiKey ?? ""}
                  onChange={(e) => persistSettings({ ...settings, apiKey: e.target.value })}
                  placeholder="Alleen nodig als API_KEY in Docker staat"
                />
              </div>
              <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
                Standaard praat de app met dezelfde Next.js-server op dit apparaat. Printer:{" "}
                {process.env.NEXT_PUBLIC_PRINTER_HINT ?? "via server PRINTER_HOST"}.
              </p>
            </div>
          )}
        </aside>
      </div>

      <footer className="toolbar">
        <button type="button" className="btn" onClick={addText}>
          Tekst
        </button>
        <button type="button" className="btn" onClick={addRect}>
          Rechthoek
        </button>
        <button type="button" className="btn" onClick={addLine}>
          Lijn
        </button>
        <button type="button" className="btn" onClick={() => setPanel("icons")}>
          Figuurtjes
        </button>
        <button
          type="button"
          className="btn"
          disabled={elements.length === 0}
          onClick={() => scaleAllElements(1.1)}
        >
          Alles groter
        </button>
        <button
          type="button"
          className="btn"
          disabled={elements.length === 0}
          onClick={() => scaleAllElements(0.9)}
        >
          Alles kleiner
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={printing}
          onClick={() => void printLabel()}
        >
          {printing ? "Bezig…" : "Druk af"}
        </button>
      </footer>
    </div>
  );
}

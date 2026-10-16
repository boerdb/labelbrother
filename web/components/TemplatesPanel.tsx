"use client";

import { useEffect, useState } from "react";
import { v4 as uuid } from "uuid";
import { LabelPreview } from "@/components/LabelPreview";
import { Icon } from "@/components/ui/Icon";
import type { EditorElement } from "@/lib/editorTypes";
import type { LabelSizeSpec } from "@/lib/labelSizes";
import { BUILTIN_TEMPLATES } from "@/lib/templates";
import {
  deleteTemplate,
  listSavedTemplates,
  saveTemplate,
  type SavedTemplate,
} from "@/lib/storage";

type Notify = (kind: "info" | "success" | "error", message: string) => void;

interface TemplatesPanelProps {
  spec: LabelSizeSpec;
  elements: EditorElement[];
  onApply: (elements: EditorElement[], scale: number, name: string) => void;
  notify: Notify;
}

const SCALES = [80, 100, 125, 150, 200];

export default function TemplatesPanel({ spec, elements, onApply, notify }: TemplatesPanelProps) {
  const [saved, setSaved] = useState<SavedTemplate[]>([]);
  const [saveName, setSaveName] = useState("");
  const [scale, setScale] = useState(100);

  useEffect(() => {
    void listSavedTemplates().then(setSaved);
  }, []);

  const save = async () => {
    const name = saveName.trim() || `Label ${new Date().toLocaleDateString("nl-NL")}`;
    await saveTemplate({
      id: uuid(),
      name,
      document: { labelSizeId: spec.id, elements: structuredClone(elements) },
      updatedAt: Date.now(),
    });
    setSaved(await listSavedTemplates());
    setSaveName("");
    notify("success", `“${name}” opgeslagen`);
  };

  const remove = async (template: SavedTemplate) => {
    if (!window.confirm(`“${template.name}” verwijderen?`)) return;
    await deleteTemplate(template.id);
    setSaved(await listSavedTemplates());
    notify("info", `“${template.name}” verwijderd`);
  };

  return (
    <div className="panel-body">
      <section className="panel-group">
        <h3>Huidig label bewaren</h3>
        <form
          className="inline-form"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <input
            className="input"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder="Naam van sjabloon"
            aria-label="Naam van sjabloon"
          />
          <button type="submit" className="btn btn-primary" disabled={elements.length === 0}>
            <Icon name="save" size={16} />
            Opslaan
          </button>
        </form>
      </section>

      {saved.length > 0 && (
        <section className="panel-group">
          <h3>Mijn sjablonen</h3>
          <div className="template-grid">
            {saved.map((t) => (
              <div key={t.id} className="template-card">
                <button
                  type="button"
                  className="template-main"
                  onClick={() => onApply(t.document.elements, 100, t.name)}
                >
                  <LabelPreview elements={t.document.elements} width={spec.width} height={spec.height} />
                  <span className="template-name">{t.name}</span>
                </button>
                <button
                  type="button"
                  className="btn btn-icon btn-sm template-delete"
                  aria-label={`${t.name} verwijderen`}
                  title="Verwijderen"
                  onClick={() => void remove(t)}
                >
                  <Icon name="trash" size={14} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="panel-group">
        <div className="group-head">
          <h3>Voorbeelden</h3>
          <label className="mini-select">
            Grootte
            <select className="select select-sm" value={scale} onChange={(e) => setScale(Number(e.target.value))}>
              {SCALES.map((s) => (
                <option key={s} value={s}>
                  {s}%
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="template-grid">
          {BUILTIN_TEMPLATES.map((t) => (
            <div key={t.id} className="template-card">
              <button type="button" className="template-main" onClick={() => onApply(t.elements, scale, t.name)}>
                <LabelPreview elements={t.elements} width={spec.width} height={spec.height} />
                <span className="template-name">{t.name}</span>
                <span className="template-desc">{t.description}</span>
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

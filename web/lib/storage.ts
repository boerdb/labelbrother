import type { EditorDocument } from "./editorTypes";
import type { IconDef } from "./icons";

const DB_NAME = "brotherdruk";
const STORE = "templates";
const PACK_STORE = "iconPacks";
const DB_VERSION = 2;

export interface SavedIconPack {
  id: string;
  icons: IconDef[];
  updatedAt: number;
}

export interface SavedTemplate {
  id: string;
  name: string;
  document: EditorDocument;
  updatedAt: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(PACK_STORE)) {
        db.createObjectStore(PACK_STORE, { keyPath: "id" });
      }
    };
  });
}

export async function listSavedTemplates(): Promise<SavedTemplate[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    const req = store.getAll();
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const items = (req.result as SavedTemplate[]).sort(
        (a, b) => b.updatedAt - a.updatedAt,
      );
      resolve(items);
    };
  });
}

export async function saveTemplate(template: SavedTemplate): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(template);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteTemplate(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function listSavedIconPacks(): Promise<SavedIconPack[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PACK_STORE, "readonly");
    const req = tx.objectStore(PACK_STORE).getAll();
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result as SavedIconPack[]);
  });
}

export async function saveIconPack(pack: SavedIconPack): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PACK_STORE, "readwrite");
    tx.objectStore(PACK_STORE).put(pack);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteIconPack(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PACK_STORE, "readwrite");
    tx.objectStore(PACK_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

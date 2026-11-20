/** Ảnh tiến triển: chỉ lưu trong IndexedDB trên thiết bị này, không tải lên đâu cả. */
export type Photo = { id: string; date: string; blob: Blob; w: number; h: number; createdAt: number };

const DB = "niks-local", STORE = "photos";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" }).createIndex("date", "date");
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then((db) => new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => { resolve(req.result); db.close(); };
    tx.onerror = () => { reject(tx.error); db.close(); };
  }));
}

export async function listPhotos(): Promise<Photo[]> {
  const all = await run<Photo[]>("readonly", (s) => s.getAll() as IDBRequest<Photo[]>);
  return all.sort((a, b) => (a.date === b.date ? a.createdAt - b.createdAt : a.date < b.date ? -1 : 1));
}

export const deletePhoto = (id: string) => run("readwrite", (s) => s.delete(id));

/** Thu nhỏ ảnh (cạnh dài 1080px) rồi lưu */
export async function addPhoto(file: File, date: string): Promise<Photo> {
  const img = await loadImage(file);
  const scale = Math.min(1, 1080 / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
  const blob: Blob = await new Promise((r, j) => canvas.toBlob((b) => (b ? r(b) : j(new Error("encode"))), "image/jpeg", 0.85));
  const photo: Photo = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, date, blob, w, h, createdAt: Date.now() };
  await run("readwrite", (s) => s.put(photo));
  return photo;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("image")); };
    img.src = url;
  });
}

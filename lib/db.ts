const DB_NAME = 'cuptune';
const DB_VER = 1;
let dbp: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (dbp) return dbp;
  dbp = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB tidak didukung'));
      return;
    }
    const r = indexedDB.open(DB_NAME, DB_VER);
    r.onupgradeneeded = () => {
      const d = r.result;
      if (!d.objectStoreNames.contains('kv')) d.createObjectStore('kv');
      if (!d.objectStoreNames.contains('blobs')) d.createObjectStore('blobs');
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error ?? new Error('IndexedDB gagal dibuka'));
  });
  dbp.catch(() => {
    dbp = null;
  });
  return dbp;
}

function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode);
        const rq = fn(t.objectStore(store));
        t.oncomplete = () => resolve(rq.result);
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error);
      }),
  );
}

export const kvGet = <T>(k: string) => tx<T | undefined>('kv', 'readonly', (s) => s.get(k));
export const kvSet = (k: string, v: unknown) => tx('kv', 'readwrite', (s) => s.put(v, k));
export const blobPut = (id: string, b: Blob) => tx('blobs', 'readwrite', (s) => s.put(b, id));
export const blobGet = (id: string) => tx<Blob | undefined>('blobs', 'readonly', (s) => s.get(id));
export const blobDel = (id: string) => tx('blobs', 'readwrite', (s) => s.delete(id));

export async function storageEstimate(): Promise<{ usage: number; quota: number } | null> {
  try {
    if (navigator.storage?.estimate) {
      const e = await navigator.storage.estimate();
      return { usage: e.usage ?? 0, quota: e.quota ?? 0 };
    }
  } catch {
    /* diabaikan */
  }
  return null;
}

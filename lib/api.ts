'use client';
import { useCallback, useEffect, useState } from 'react';
import type { ErrorCode } from './types';

export class ClientApiError extends Error {
  constructor(public code: ErrorCode, message: string) {
    super(message);
  }
}

const cache = new Map<string, { exp: number; data: unknown }>();
const inflight = new Map<string, Promise<unknown>>();
const DEFAULT_TTL = 10 * 60_000;

export function clearApiCache(): number {
  const n = cache.size;
  cache.clear();
  return n;
}

export function apiCacheSize(): number {
  return cache.size;
}

export function toErr(e: unknown): ClientApiError {
  return e instanceof ClientApiError ? e : new ClientApiError('NETWORK', 'Tidak dapat terhubung. Periksa koneksi internetmu.');
}

export async function apiGet<T>(url: string, ttl: number = DEFAULT_TTL): Promise<T> {
  const hit = cache.get(url);
  if (ttl > 0 && hit && hit.exp > Date.now()) return hit.data as T;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new ClientApiError('NETWORK', 'Kamu sedang offline. Sambungkan internet lalu coba lagi.');
  }
  const existing = inflight.get(url);
  if (existing && ttl > 0) return existing as Promise<T>;

  const p = (async () => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12_000);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      let body: unknown;
      try {
        body = await res.json();
      } catch {
        throw new ClientApiError('BAD_RESPONSE', 'Respons server tidak valid.');
      }
      if (!res.ok) {
        const err = (body as { error?: { code?: ErrorCode; message?: string } })?.error;
        throw new ClientApiError(err?.code ?? 'UPSTREAM', err?.message ?? 'Terjadi kesalahan pada server.');
      }
      cache.set(url, { exp: Date.now() + (ttl > 0 ? ttl : DEFAULT_TTL), data: body });
      return body as T;
    } catch (e) {
      if (e instanceof ClientApiError) throw e;
      if ((e as Error).name === 'AbortError') throw new ClientApiError('TIMEOUT', 'Permintaan terlalu lama. Coba lagi.');
      throw new ClientApiError('NETWORK', 'Tidak dapat terhubung. Periksa koneksi internetmu.');
    } finally {
      clearTimeout(timer);
      inflight.delete(url);
    }
  })();
  inflight.set(url, p);
  return p as Promise<T>;
}

export function useApi<T>(url: string | null, enabled = true) {
  const [state, setState] = useState<{ data?: T; error?: ClientApiError }>({});
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!url || !enabled) return;
    let alive = true;
    setState({});
    apiGet<T>(url, nonce > 0 ? 0 : undefined)
      .then((d) => alive && setState({ data: d }))
      .catch((e) => alive && setState({ error: toErr(e) }));
    return () => {
      alive = false;
    };
  }, [url, enabled, nonce]);

  const retry = useCallback(() => setNonce((n) => n + 1), []);
  return { ...state, retry };
}

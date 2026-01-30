import { MessagePlugin } from 'tdesign-react';

const TOKEN_KEY = 'spw_token_v1';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (!token) {
    localStorage.removeItem(TOKEN_KEY);
    return;
  }
  localStorage.setItem(TOKEN_KEY, token);
}

export async function apiJson<T>(path: string, options?: { method?: string; body?: unknown; auth?: boolean }): Promise<T> {
  const method = options?.method ?? 'GET';
  const auth = options?.auth ?? true;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(path, {
    method,
    headers,
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await res.text();
  const data = text ? (JSON.parse(text) as unknown) : null;

  if (!res.ok) {
    // eslint-disable-next-line no-console
    console.error('api error', { path, status: res.status, data });
    throw new Error(`API_ERROR_${res.status}`);
  }

  return data as T;
}

export function toastError(e: unknown, fallback: string): void {
  // eslint-disable-next-line no-console
  console.error(e);
  MessagePlugin.error(fallback);
}

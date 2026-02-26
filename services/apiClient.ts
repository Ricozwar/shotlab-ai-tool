const API_URL = import.meta.env.VITE_API_URL as string | undefined;
const TOKEN_KEY = 'shotlab_jwt';

/** W produkcji bez VITE_API_URL używamy samego origin (Nginx proxy /api). */
function getApiBase(): string {
  const url = API_URL?.trim();
  if (url) return url;
  if (import.meta.env.PROD) return '';
  return '';
}

export function isApiConfigured(): boolean {
  return Boolean(API_URL?.trim()) || import.meta.env.PROD;
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

function authHeaders(): HeadersInit {
  const token = getStoredToken();
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export interface Usage {
  imagesUsed: number;
  imagesLimit: number;
  reelsUsed: number;
  reelsLimit: number;
  trialEndsAt: string | null;
  trialEnded: boolean;
}

export async function fetchUsage(): Promise<Usage> {
  const base = getApiBase();
  if (!import.meta.env.PROD && !base) throw new Error('API not configured');
  const res = await fetch(`${base}/api/usage`, { headers: authHeaders() });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiRemoveBackground(imageBase64: string): Promise<string> {
  const base = getApiBase();
  if (!import.meta.env.PROD && !base) throw new Error('API not configured');
  const res = await fetch(`${base}/api/remove-background`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ imageBase64 }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || res.statusText);
  }
  const data = (await res.json()) as { imageBase64: string };
  return data.imageBase64;
}

export async function apiGenerateImage(params: {
  prompt: string;
  aspectRatio: string;
  productImageBase64?: string;
  enhancements?: { lighting: string; shadows: string; autoColorMatch: boolean };
  imageSize?: string;
}): Promise<string> {
  const base = getApiBase();
  if (!import.meta.env.PROD && !base) throw new Error('API not configured');
  const res = await fetch(`${base}/api/generate-image`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || res.statusText);
  }
  const data = (await res.json()) as { url: string };
  return data.url;
}

export async function apiGenerateReel(
  prompt: string,
  firstFrameImageBase64?: string | null
): Promise<string> {
  const base = getApiBase();
  if (!import.meta.env.PROD && !base) throw new Error('API not configured');
  const res = await fetch(`${base}/api/generate-reel`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ prompt, firstFrameImageBase64 }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || res.statusText);
  }
  const data = (await res.json()) as { videoBase64: string };
  const base64 = data.videoBase64.includes(',') ? data.videoBase64.split(',')[1] : data.videoBase64;
  if (!base64) throw new Error('No video data');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: 'video/mp4' });
  return URL.createObjectURL(blob);
}

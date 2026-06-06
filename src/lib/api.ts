import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const API_BASE = '/api';

export async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  
  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.dispatchEvent(new Event('auth-failure'));
    }
    
    let errorMessage = 'API Request failed';
    if (isJson) {
      const errorData = await response.json().catch(() => ({}));
      errorMessage = errorData.error || errorMessage;
    } else {
      const text = await response.text().catch(() => 'No response body');
      const snippet = text.slice(0, 300).replace(/\s+/g, ' ');
      errorMessage = `Server Protocol Error (${response.status}): Expected JSON but received ${contentType || 'unknown'}. This usually indicates a server-side crash or a routing mismatch. Snippet: "${snippet}..."`;
    }
    throw new Error(errorMessage);
  }

  if (!isJson) {
    const text = await response.text().catch(() => 'No response body');
    const snippet = text.slice(0, 300).replace(/\s+/g, ' ');
    throw new Error(`Data Integrity Mismatch: Server returned 200 OK but content was ${contentType || 'not specified'} instead of JSON. This suggests the request reached a static file handler or SPA fallback instead of an API route. Snippet: "${snippet}..."`);
  }

  return response.json();
}

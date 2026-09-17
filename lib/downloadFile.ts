import { store } from '@/store';
import { updateAccessToken, logout } from '@/store/slices/authSlice';

const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

async function fetchPdf(path: string, accessToken: string | null): Promise<Response> {
  return fetch(`${baseUrl}${path}`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    credentials: 'include',
  });
}

/**
 * Fetches a binary file (PDF, etc.) from the API with the current auth token
 * attached, and opens it in a new tab. Needed because these endpoints return
 * `application/pdf`, not JSON, so RTK Query's fetchBaseQuery isn't a fit —
 * and because auth is a Bearer token (not a cookie), a plain <a href> to the
 * API wouldn't carry credentials.
 *
 * Mirrors baseApi.ts's 401 auto-refresh behavior: the access token is only
 * 15 minutes, and this bypasses RTK Query entirely, so without this a slip
 * print would fail with a raw 401 any time the token had quietly expired
 * since the page loaded — forcing a full page reload to fix, for no reason
 * a real user would understand.
 */
/**
 * Downloads a non-PDF file (CSV, etc.) via a synthetic <a download> click,
 * rather than opening it in a new tab like openAuthedPdf() does — a CSV
 * opened in a browser tab just shows raw text, which isn't what "export"
 * means to anyone. Shares the exact same auth/refresh handling as
 * openAuthedPdf() (see its own comment) since these hit the same kind of
 * Bearer-token-authed, non-JSON endpoint.
 */
/**
 * Row-count/truncation metadata a CSV export's response headers may carry
 * (see fee.controller.ts's exportInvoicesCsv/exportPaymentsCsv) -- lets a
 * caller toast "exported N of M" or warn about truncation instead of the
 * admin having to open the file to find out how much they actually got.
 * Optional because not every openAuthedDownload() caller's endpoint sets
 * these headers.
 */
export interface DownloadMeta {
  totalCount?: number;
  returnedCount?: number;
  truncated?: boolean;
}

export async function openAuthedDownload(path: string, accessToken: string | null, filename: string): Promise<DownloadMeta> {
  let res = await fetchPdf(path, accessToken);

  if (res.status === 401) {
    const refreshRes = await fetch(`${baseUrl}/auth/refresh`, { method: 'POST', credentials: 'include' });
    if (refreshRes.ok) {
      const body = await refreshRes.json();
      const newToken = body?.data?.accessToken as string | undefined;
      if (newToken) {
        store.dispatch(updateAccessToken(newToken));
        res = await fetchPdf(path, newToken);
      }
    } else {
      store.dispatch(logout());
    }
  }

  if (!res.ok) {
    let message = 'Could not download the file';
    try {
      const body = await res.json();
      message = body?.error?.message || message;
    } catch {
      // response wasn't JSON — keep default message
    }
    throw new Error(message);
  }

  const totalCountHeader = res.headers.get('X-Total-Count');
  const returnedCountHeader = res.headers.get('X-Returned-Count');
  const truncatedHeader = res.headers.get('X-Truncated');

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);

  return {
    totalCount: totalCountHeader ? Number(totalCountHeader) : undefined,
    returnedCount: returnedCountHeader ? Number(returnedCountHeader) : undefined,
    truncated: truncatedHeader === 'true',
  };
}

export async function openAuthedPdf(path: string, accessToken: string | null): Promise<void> {
  let res = await fetchPdf(path, accessToken);

  if (res.status === 401) {
    const refreshRes = await fetch(`${baseUrl}/auth/refresh`, { method: 'POST', credentials: 'include' });
    if (refreshRes.ok) {
      const body = await refreshRes.json();
      const newToken = body?.data?.accessToken as string | undefined;
      if (newToken) {
        store.dispatch(updateAccessToken(newToken));
        res = await fetchPdf(path, newToken);
      }
    } else {
      store.dispatch(logout());
    }
  }

  if (!res.ok) {
    let message = 'Could not generate PDF';
    try {
      const body = await res.json();
      message = body?.error?.message || message;
    } catch {
      // response wasn't JSON — keep default message
    }
    throw new Error(message);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  // Revoke after a delay so the new tab has time to actually load it.
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

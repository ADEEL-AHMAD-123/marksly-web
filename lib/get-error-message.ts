/**
 * Single place to turn an RTK Query error into text a user should see.
 *
 * Every auth page used to reimplement `error?.data?.error?.message || '...'`
 * independently, which meant six slightly different fallback strings and no
 * shared handling for network failures / unexpected shapes. Use this
 * everywhere an auth (or other) mutation error needs to become UI copy.
 */
export function getErrorMessage(error: unknown, fallback: string): string {
  const err = error as any;

  // RTK Query network-level failure (server unreachable, DNS, CORS, etc.) —
  // there's no `error.data` at all in this case, so it needs its own branch
  // rather than falling through to a confusing generic message.
  if (err?.status === 'FETCH_ERROR' || err?.status === 'TIMEOUT_ERROR') {
    return 'Cannot reach the server. Please check your connection and try again.';
  }

  // Our backend's standard error envelope: { error: { code, message } }.
  const backendMessage = err?.data?.error?.message;
  if (typeof backendMessage === 'string' && backendMessage.trim()) {
    return backendMessage;
  }

  return fallback;
}

/** Pulls the backend's error `code` out of an RTK Query error, if present. */
export function getErrorCode(error: unknown): string | undefined {
  return (error as any)?.data?.error?.code;
}

/** Pulls the backend's structured error `details` payload, if present —
 *  e.g. login()'s MULTIPLE_ACCOUNTS error attaches the list of
 *  institutions to choose from here (see AppError's optional 4th arg). */
export function getErrorDetails<T = unknown>(error: unknown): T | undefined {
  return (error as any)?.data?.error?.details;
}
